import os
from copy import deepcopy
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datasets import load_dataset, set_caching_enabled
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from transformers import (
    # Preprocessing / Common
    AutoTokenizer, AutoFeatureExtractor,
    # Text & Image Models (Now, image transformers like ViTModel, DeiTModel, BEiT can also be loaded using AutoModel)
    AutoModel,
    # Training / Evaluation
    TrainingArguments, Trainer,
    # Misc
    logging
)


from sklearn.metrics import accuracy_score, f1_score


os.environ['HF_HOME'] = os.path.join(".", "cache")
# SET ONLY 1 GPU DEVICE
os.environ['CUDA_VISIBLE_DEVICES'] = '0'

set_caching_enabled(True)
logging.set_verbosity_error()

device = torch.device('cuda:0' if torch.cuda.is_available() else 'cpu')
print(device)

#Additional Info when using cuda
if device.type == 'cuda':
    print(torch.cuda.get_device_name(0))


from datasets import load_dataset
import os

# Load the dataset
dataset = load_dataset(
    "csv",
    data_files={
        "train": os.path.join("..", r"C:\Users\Vishnu\Documents\Gitprojects\ps\pathvqa\model", "trainpvqaimg.csv"),
        "test": os.path.join("..", r"C:\Users\Vishnu\Documents\Gitprojects\ps\pathvqa\model", "testpvqaimg.csv")
    }
)

with open(os.path.join("..", r"C:\Users\Vishnu\Documents\Gitprojects\ps\pathvqa\model", "unique_answers.txt")) as f:
    YNSanswer_space = f.read().splitlines()

# Map function to process the dataset
def process_example(example):
    labels = []
    for ans in example['answer']:
        ans_cleaned = ans.replace(" ", "").split(",")[0]
        try:
            label = YNSanswer_space.index(ans_cleaned)
        except ValueError:
            label = -1  # or another default label
        labels.append(label)
    return {'label': labels}

# Apply the map function to the dataset
dataset = dataset.map(process_example, batched=True)

# Print the processed dataset
print(dataset)

"""### Look at some of the Question/Image/Answer combinations"""

from IPython.display import display
from PIL import Image
import os
import numpy as np

def showExample(train=True, id=None):
    if train:
        data = dataset["train"]
    else:
        data = dataset["test"]
    if id is None:
        id = np.random.randint(len(data))
    image_path = os.path.join("..", r"C:\Users\Vishnu\Documents\Gitprojects\ps\pathvqa\train", data[id]["image"] + ".jpg")
    image = Image.open(image_path)
    # Convert the image to RGB mode
    if image.mode != 'RGB':
        image = image.convert('RGB')

    display(image)

    print("Question:\t", data[id]["question"])
    print("Answer:\t\t", data[id]["answer"], "(Label: {0})".format(data[id]["label"]))

# Replace "dataset" with your actual dataset object
# Also, make sure the dataset object and other variables used in the function are defined correctly.


"""### Create a Multimodal Collator for the Dataset

This will be used in the `Trainer()` to automatically create the `Dataloader` from the dataset to pass inputs to the model

The collator will process the **question (text)** & the **image**, and return the **tokenized text (with attention masks)** along with the **featurized image** (basically, the **pixel values**). These will be fed into our multimodal transformer model for question answering.
"""

@dataclass
class MultimodalCollator:
    tokenizer: AutoTokenizer
    preprocessor: AutoFeatureExtractor

    def tokenize_text(self, texts: List[str]):
        encoded_text = self.tokenizer(
            text=texts,
            padding='longest',
            max_length=24,
            truncation=True,
            return_tensors='pt',
            return_token_type_ids=True,
            return_attention_mask=True,
        )
        return {
            "input_ids": encoded_text['input_ids'].squeeze(),
            "token_type_ids": encoded_text['token_type_ids'].squeeze(),
            "attention_mask": encoded_text['attention_mask'].squeeze(),
        }

    def preprocess_images(self, images: List[str]):
        processed_images = self.preprocessor(
            images=[Image.open(os.path.join("..", "/content/drive/MyDrive", "train",  image_id + ".jpg")).convert('RGB') for image_id in images],
            return_tensors="pt",
        )
        return {
            "pixel_values": processed_images['pixel_values'].squeeze(),
        }

    def __call__(self, raw_batch_dict):
        return {
            **self.tokenize_text(
                raw_batch_dict['question']
                if isinstance(raw_batch_dict, dict) else
                [i['question'] for i in raw_batch_dict]
            ),
            **self.preprocess_images(
                raw_batch_dict['image']
                if isinstance(raw_batch_dict, dict) else
                [i['image'] for i in raw_batch_dict]
            ),
            'labels': torch.tensor(
                raw_batch_dict['label']
                if isinstance(raw_batch_dict, dict) else
                [i['label'] for i in raw_batch_dict],
                dtype=torch.int64
            ),
        }

"""## Defining the Multimodal VQA Model Architecture

Multimodal models can be of various forms to capture information from the text & image modalities, along with some cross-modal interaction as well.
Here, we explore **"Fusion" Models**, that fuse information from the text encoder & image encoder to perform the downstream task (visual question answering).

The text encoder can be a text-based transformer model (like BERT, RoBERTa, etc.) while the image encoder could be an image transformer (like ViT, Deit, BeIT, etc.). After passing the tokenized question through the text-based transformer & the image features through the image transformer, the outputs are concatenated & passed through a fully-connected network with an output having the same dimensions as the answer-space.

Since we model the VQA task as a multi-class classification, it is natural to use the *Cross-Entropy Loss* as the loss function.
"""

class MultimodalVQAModel(nn.Module):
    def __init__(
            self,
            num_labels: int = len(YNSanswer_space),
            intermediate_dim: int = 512,
            pretrained_text_name: str = 'bert-base-uncased',
            pretrained_image_name: str = 'google/vit-base-patch16-224-in21k'):

        super(MultimodalVQAModel, self).__init__()
        self.num_labels = num_labels
        self.pretrained_text_name = pretrained_text_name
        self.pretrained_image_name = pretrained_image_name

        self.text_encoder = AutoModel.from_pretrained(
            self.pretrained_text_name,
        )
        self.image_encoder = AutoModel.from_pretrained(
            self.pretrained_image_name,
        )
        self.fusion = nn.Sequential(
            nn.Linear(self.text_encoder.config.hidden_size + self.image_encoder.config.hidden_size, intermediate_dim),
            nn.ReLU(),
            nn.Dropout(0.5),
        )

        self.classifier = nn.Linear(intermediate_dim, self.num_labels)

        self.criterion = nn.CrossEntropyLoss()

    def forward(
            self,
            input_ids: torch.LongTensor,
            pixel_values: torch.FloatTensor,
            attention_mask: Optional[torch.LongTensor] = None,
            token_type_ids: Optional[torch.LongTensor] = None,
            labels: Optional[torch.LongTensor] = None):

        encoded_text = self.text_encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
            return_dict=True,
        )
        encoded_image = self.image_encoder(
            pixel_values=pixel_values,
            return_dict=True,
        )
        fused_output = self.fusion(
            torch.cat(
                [
                    encoded_text['pooler_output'],
                    encoded_image['pooler_output'],
                ],
                dim=1
            )
        )
        logits = self.classifier(fused_output)

        out = {
            "logits": logits
        }
        if labels is not None:
            loss = self.criterion(logits, labels)
            out["loss"] = loss

        return out

"""### Define a Function to Create the Multimodal VQA Models along with their Collators

We plan to experiment with multiple pretrained text & image encoders for our VQA Model. Thus, we will have to create the corresponding collators along with the model (tokenizers, featurizers & models need to be loaded from same pretrained checkpoints)
"""

def createMultimodalVQACollatorAndModel(text='bert-base-uncased', image='google/vit-base-patch16-224-in21k'):
    tokenizer = AutoTokenizer.from_pretrained(text)
    preprocessor = AutoFeatureExtractor.from_pretrained(image)

    multi_collator = MultimodalCollator(
        tokenizer=tokenizer,
        preprocessor=preprocessor,
    )


    multi_model = MultimodalVQAModel(pretrained_text_name=text, pretrained_image_name=image).to(device)
    return multi_collator, multi_model

"""## Performance Metrics from Visual Question Answering

### Wu and Palmer Similarity

The Wu & Palmer similarity is a metric to calculate the sematic similarity between 2 words/phrases based on the position of concepts $c_1$ and $c_2$ in the taxonomy, relative to the position of their **_Least Common Subsumer_** $LCS(c_1, c_2)$. *(In an directed acyclic graph, the Least Common Subsumer is the is the deepest node that has both the nodes under consideration as descendants, where we define each node to be a descendant of itself)*

WUP similarity works for single-word answers (& hence, we use if for our task), but doesn't work for phrases or sentences.

`nltk` has an implementation of Wu & Palmer similarity score based on the WordNet taxanomy. Here, we have adapted the [implementation of Wu & Palmer similarity as defined along with the DAQUAR dataset](https://datasets.d2.mpi-inf.mpg.de/mateusz14visual-turing/calculate_wups.py).
"""

def wup_measure(a,b,similarity_threshold=0.925):
    """
    Returns Wu-Palmer similarity score.
    More specifically, it computes:
        max_{x \in interp(a)} max_{y \in interp(b)} wup(x,y)
        where interp is a 'interpretation field'
    """
    def get_semantic_field(a):
        weight = 1.0
        semantic_field = wordnet.synsets(a,pos=wordnet.NOUN)
        return (semantic_field,weight)


    def get_stem_word(a):
        """
        Sometimes answer has form word\d+:wordid.
        If so we return word and downweight
        """
        weight = 1.0
        return (a,weight)


    global_weight=1.0

    (a,global_weight_a)=get_stem_word(a)
    (b,global_weight_b)=get_stem_word(b)
    global_weight = min(global_weight_a,global_weight_b)

    if a==b:
        # they are the same
        return 1.0*global_weight

    if a==[] or b==[]:
        return 0


    interp_a,weight_a = get_semantic_field(a)
    interp_b,weight_b = get_semantic_field(b)

    if interp_a == [] or interp_b == []:
        return 0

    # we take the most optimistic interpretation
    global_max=0.0
    for x in interp_a:
        for y in interp_b:
            local_score=x.wup_similarity(y)
            if local_score > global_max:
                global_max=local_score

    # we need to use the semantic fields and therefore we downweight
    # unless the score is high which indicates both are synonyms
    if global_max < similarity_threshold:
        interp_weight = 0.1
    else:
        interp_weight = 1.0

    final_score=global_max*weight_a*weight_b*interp_weight*global_weight
    return final_score

def batch_wup_measure(labels, preds):
    wup_scores = [wup_measure(YNSanswer_space[label], YNSanswer_space[pred]) for label, pred in zip(labels, preds)]
    return np.mean(wup_scores)

"""**This function is useful for evaluating the semantic similarity between the true and predicted labels in a batch, considering the Wu-Palmer similarity measure. The function assumes that YNSanswer_space contains the possible answers in a pre-defined space.**"""

!pip install nltk

import nltk
nltk.download('wordnet')

labels = np.random.randint(len(YNSanswer_space), size=5)
preds = np.random.randint(len(YNSanswer_space), size=5)

def showAnswers(ids):
    print([YNSanswer_space[id] for id in ids])

showAnswers(labels)
showAnswers(preds)

print("Predictions vs Labels: ", batch_wup_measure(labels, preds))
print("Labels vs Labels: ", batch_wup_measure(labels, labels))

"""**Here, you calculate and print the Wu-Palmer similarity scores using the batch_wup_measure function. The first line computes the similarity between the randomly generated predictions and labels, while the second line calculates the similarity between the randomly generated labels and themselves.**"""

def compute_metrics(eval_tuple: Tuple[np.ndarray, np.ndarray]) -> Dict[str, float]:
    logits, labels = eval_tuple
    preds = logits.argmax(axis=-1)
    return {
        "wups": batch_wup_measure(labels, preds),
        "acc": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds, average='macro')
    }

"""## Model Training & Evaluation

### Define the Arguments needed for Training
"""

args = TrainingArguments(
    output_dir="checkpoint",
    seed=12345,
    evaluation_strategy="steps",
    eval_steps=100,
    logging_strategy="steps",
    logging_steps=100,
    save_strategy="steps",
    save_steps=100,
    save_total_limit=3,             # Save only the last 3 checkpoints at any given time while training
    metric_for_best_model='wups',
    per_device_train_batch_size=32,
    per_device_eval_batch_size=32,
    remove_unused_columns=False,
    num_train_epochs=10,
    fp16=False,
    # warmup_ratio=0.01,
    # learning_rate=5e-4,
    # weight_decay=1e-4,
    # gradient_accumulation_steps=2,
    dataloader_num_workers=8,
    load_best_model_at_end=True,
)

"""### Create the Multimodal Models using User-Defined Text/Image  Transformers & Train it on the Dataset"""

def createAndTrainModel(dataset, args, text_model='bert-base-uncased', image_model='google/vit-base-patch16-224-in21k', multimodal_model='bert_vit'):
    collator, model = createMultimodalVQACollatorAndModel(text_model, image_model)

    multi_args = deepcopy(args)
    multi_args.output_dir = os.path.join("..","checkpoint", multimodal_model)
    multi_trainer = Trainer(
        model,
        multi_args,
        train_dataset=dataset['train'],
        eval_dataset=dataset['test'],
        data_collator=collator,
        compute_metrics=compute_metrics
    )

    train_multi_metrics = multi_trainer.train()
    eval_multi_metrics = multi_trainer.evaluate()

    return collator, model, train_multi_metrics, eval_multi_metrics

collator, model, train_multi_metrics, eval_multi_metrics = createAndTrainModel(dataset, args)

eval_multi_metrics

# import pickle

# # ... (other code)

# # Save the model to a .pkl file
# model_filepath = "model.pkl"
# with open(model_filepath, 'wb') as model_file:
#     pickle.dump(model, model_file)

import pickle

# Assuming you have already executed the createAndTrainModel function
collator, model, train_multi_metrics, eval_multi_metrics = createAndTrainModel(dataset, args)

# Save the variables to a pickle file
with open('model_data.pkl', 'wb') as file:
    pickle.dump((collator, model, train_multi_metrics, eval_multi_metrics), file)

import pickle

# Load the variables from the pickle file
with open('model_data.pkl', 'rb') as file:
    collator, model, train_multi_metrics, eval_multi_metrics = pickle.load(file)

sample = collator(dataset["test"][3432:3437])

input_ids = sample["input_ids"].to(device)
token_type_ids = sample["token_type_ids"].to(device)
attention_mask = sample["attention_mask"].to(device)
pixel_values = sample["pixel_values"].to(device)
labels = sample["labels"].to(device)

import pickle

# ... (other code)

# Load the model from the .pkl file
with open(model_filepath, 'rb') as model_file:
    loaded_model = pickle.load(model_file)
# Move the model to the GPU if available

device = 'cuda' if torch.cuda.is_available() else 'cpu'
loaded_model.to(device)
# Set the loaded model to

# Set the loaded model to evaluation mode
loaded_model.eval()

# Continue with your inference using the loaded model
loaded_output = loaded_model(input_ids, pixel_values, attention_mask, token_type_ids, labels)

loaded_preds = loaded_output["logits"].argmax(axis=-1).cpu().numpy()

for i in range(3432, 3437):
    print("*********************************************************")
    showExample(train=False, id=i)
    print("Predicted Answer:\t", YNSanswer_space[loaded_preds[i-3432]])
    print("*********************************************************")

"""## Examples of Model Inferencing

### Loading the Model from Checkpoint

### Pass the Samples through the Model & inspect the Predictions

## Inspecting Model Size
"""

def countTrainableParameters(model):
    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print("No. of trainable parameters:\t{0:,}".format(num_params))

countTrainableParameters(loaded_model) # For BERT-ViT model