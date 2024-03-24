import json
import boto3
import botocore
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
    
    response = table.get_item(Key={'word': word})
    
    if 'Item' in response:
        item = response['Item']

        return {
            'statusCode': 200,
            'body': f'[{json.dumps(item)}]'
        }
        
    '''else:
        try:
            table.put_item(
                Item={
                'word': word,
                'usages': ['usage1', 'usage2', 'usage3'],
                "related_information": "관련 정보 1, 2, 3",
                'meanings': '뜻1, 뜻2'
                },
                ConditionExpression='attribute_not_exists(word)'
            )
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                raise
'''
    client = OpenAI( api_key=get_api_key() )
    
    word = word.lower()
    user_prompt = f'''I want to memorize the meanings and usages of the vocabulary "{word}".
Create a json string including 3 short usage samples including "{word}", 
related information helpful to memorize "{word}" in Korean, 
and dictionary meanings of "{word}" in Korean. 
Remember that if the "{word}" is not a valid English vocabulary, use the closed word instead of "{word}".
The json should be like:
{{  "word": {word},
    "usages": [
    "The servant diligently attended to the needs of the household.",
    "She hired a servant to help with the chores around the house.",
    "In many traditional societies, servants played crucial roles in maintaining the daily operations of wealthy households."
  ],
  "related_information": "serve, serving, service - 봉사하다, 섬기다",
  "meanings": "하인, 종"
   }}'''
   
   
    completion = client.chat.completions.create(
        model='gpt-3.5-turbo',
        messages=[
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": user_prompt},
  ],
        temperature=0,
        max_tokens=256,
        top_p=1,
        frequency_penalty=0.0,
        presence_penalty=0.0
        )
    
    response = completion.choices[0].message.content
    print(f'2    response = {response}')
    item = json.loads(response)
    print(f'3    item = {item}')
    
    try:
            table.put_item(
                Item={
                'word': item['word'],
                'usages': item['usages'],
                "related_information": item['related_information'],
                'meanings': item['meanings']
                },
                ConditionExpression='attribute_not_exists(word)'
            )
    except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                raise


    return {
        'statusCode': 200,
        #'body': json.dumps(f'[{response}]')
        'body': f'[{response}]'
    }
    
