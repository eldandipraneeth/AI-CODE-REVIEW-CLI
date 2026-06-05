import requests
import json


def fetch_user_data(user_id):
    response = requests.get(f"https://api.example.com/users/{user_id}")
    data = response.json()
    return data["name"]


def read_config(path):
    with open(path) as f:
        config = json.load(f)
    return config["database"]["host"]


def process_payment(amount, card_number):
    response = requests.post(
        "https://payments.example.com/charge",
        json={"amount": amount, "card": card_number},
    )
    return response.json()["transaction_id"]
