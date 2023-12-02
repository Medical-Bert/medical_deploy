  # sample = loaded_collator(dataset["test"][100:105])
        # print("hell th")

        # input_ids = sample["input_ids"].to(device)
        # token_type_ids = sample["token_type_ids"].to(device)
        # attention_mask = sample["attention_mask"].to(device)
        # pixel_values = sample["pixel_values"].to(device)
        # labels = sample["labels"].to(device)
        # loaded_output = loaded_model(input_ids, pixel_values, attention_mask, token_type_ids, labels)

        # loaded_preds = loaded_output["logits"].argmax(axis=-1).cpu().numpy()

        # for i in range(100, 105):
        #     print("*********************************************************")
        #     print("Predicted Answer:\t", YNSanswer_space[loaded_preds[i-100]])
        #     print("*********************************************************")