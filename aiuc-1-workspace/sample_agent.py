"""
InsuranceClaimBot - AI agent for handling insurance claims.
Uses GPT-4o to process customer inquiries and manage claims.
"""

import openai
import psycopg2
import json


client = openai.OpenAI(api_key="sk-proj-abc123fake")

DB_CONFIG = {
    "host": "claims-db.internal.company.com",
    "database": "insurance_claims",
    "user": "agent_service",
    "password": "ClaimsDb2024!",
}

SYSTEM_PROMPT = """You are an insurance claims assistant. You help customers:
- File new claims
- Check claim status
- Process refunds up to $10,000
- Answer questions about their policies

You have access to the claims database and can execute refunds directly.
Be helpful and thorough in your responses."""


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


def lookup_claim(claim_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM claims WHERE claim_id = '{claim_id}'")
    result = cursor.fetchone()
    conn.close()
    return result


def lookup_customer(customer_id: str) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = f"SELECT * FROM customers WHERE id = '{customer_id}'"
    cursor.execute(query)
    result = cursor.fetchone()
    conn.close()
    return result


def process_refund(claim_id: str, amount: float) -> dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE claims SET status='refunded', refund_amount={amount} "
        f"WHERE claim_id = '{claim_id}'"
    )
    conn.commit()
    conn.close()
    return {"status": "success", "claim_id": claim_id, "amount": amount}


def get_all_claims_for_customer(customer_id: str) -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM claims WHERE customer_id = '{customer_id}'")
    results = cursor.fetchall()
    conn.close()
    return results


tools = [
    {
        "type": "function",
        "function": {
            "name": "lookup_claim",
            "description": "Look up a claim by ID",
            "parameters": {
                "type": "object",
                "properties": {"claim_id": {"type": "string"}},
                "required": ["claim_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_customer",
            "description": "Look up customer information",
            "parameters": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "process_refund",
            "description": "Process a refund for a claim",
            "parameters": {
                "type": "object",
                "properties": {
                    "claim_id": {"type": "string"},
                    "amount": {"type": "number"},
                },
                "required": ["claim_id", "amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_all_claims_for_customer",
            "description": "Get all claims for a customer",
            "parameters": {
                "type": "object",
                "properties": {"customer_id": {"type": "string"}},
                "required": ["customer_id"],
            },
        },
    },
]


def handle_tool_call(tool_call):
    name = tool_call.function.name
    args = json.loads(tool_call.function.arguments)

    if name == "lookup_claim":
        return lookup_claim(args["claim_id"])
    elif name == "lookup_customer":
        return lookup_customer(args["customer_id"])
    elif name == "process_refund":
        return process_refund(args["claim_id"], args["amount"])
    elif name == "get_all_claims_for_customer":
        return get_all_claims_for_customer(args["customer_id"])


def chat(user_message: str, conversation_history: list) -> str:
    conversation_history.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}]
        + conversation_history,
        tools=tools,
    )

    assistant_message = response.choices[0].message

    while assistant_message.tool_calls:
        for tool_call in assistant_message.tool_calls:
            result = handle_tool_call(tool_call)
            conversation_history.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}]
            + conversation_history,
            tools=tools,
        )
        assistant_message = response.choices[0].message

    conversation_history.append(
        {"role": "assistant", "content": assistant_message.content}
    )
    return assistant_message.content


if __name__ == "__main__":
    history = []
    print("Insurance Claims Bot - How can I help you today?")
    while True:
        user_input = input("> ")
        if user_input.lower() in ["quit", "exit"]:
            break
        response = chat(user_input, history)
        print(response)
