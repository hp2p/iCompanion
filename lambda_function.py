import json
import boto3
import time
from openai import OpenAI

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('iCompanionWordsTable')


def get_api_key():
    lambda_client = boto3.client('lambda')
    response = lambda_client.invoke(
            FunctionName = 'arn:aws:lambda:us-west-2:481478219070:function:openai_get_api_key',
            InvocationType = 'RequestResponse'
        )

    openai_api_key = json.load(response['Payload'])['body']['api_key']
    return openai_api_key
    
    
def lambda_handler(event, context):
    gmt_time = time.gmtime()

    now = time.strftime('%a, %d %b %Y %H:%M:%S +0000', gmt_time)
    word = event['word']
    response = table.put_item(
        Item={
            'word': word,
            'LatestGreetingTime':now,
            'usages': ['usage1', 'usage2', 'usage3'],
            'meaning': '뜻1, 뜻2'
            }
    )
    
    client = OpenAI( api_key=get_api_key() )
    completion = client.chat.completions.create(
        model='gpt-3.5-turbo',
        messages=[
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": f"Write 3 sentences including {word}"},
  ],
        temperature=0,
        max_tokens=100,
        top_p=1,
        frequency_penalty=0.0,
        presence_penalty=0.0
        )
    
    response = completion.choices[0].message.content

    return {
        'statusCode': 200,
        'body': json.dumps(f'Hello from Lambda, [{response}]')
    }

