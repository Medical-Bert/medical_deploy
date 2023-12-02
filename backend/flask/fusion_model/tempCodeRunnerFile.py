import torch
# print(torch.cuda.is_available())

# Your scalar value
scalar_value = 143

# Convert to PyTorch tensor
tensor_value = torch.tensor(scalar_value)

# Print the tensor
print(tensor_value)

# Convert to PyTorch tensor and move to CUDA device
tensor_value = torch.tensor(scalar_value).to('cuda:0')

# Print the tensor
print(tensor_value)
