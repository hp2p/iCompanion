import json
import boto3
import botocore
import time
from openai import OpenAI

dynamodb = boto3.resource('dynamodb')
words_table = dynamodb.Table('iCompanionWordsTable')
users_table = dynamodb.Table('iCompanionUsersTable')


def get_api_key():
    lambda_client = boto3.client('lambda')
    response = lambda_client.invoke(
            FunctionName = 'arn:aws:lambda:us-west-2:481478219070:function:openai_get_api_key',
            InvocationType = 'RequestResponse'
        )

    openai_api_key = json.load(response['Payload'])['body']['api_key']
    return openai_api_key
    
    
def query_llm(word):
    client = OpenAI( api_key=get_api_key() )
    user_prompt = f'''I want to memorize the meanings and usages of the vocabulary "{word}".
Create a json string including 3 short usage samples including "{word}", 
related information helpful to memorize "{word}" in Korean, 
and dictionary meanings of "{word}" in Korean. 
Remember that if the "{word}" is not a valid English vocabulary, use the closest word instead of "{word}".
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
    return response
    
    
TEMP_USER_ID = 'jaeman'

def lambda_handler(event, context):

    today = time.strftime('%Y%m%d', time.gmtime())
    word = event['word']
    
    user_info = users_table.get_item(Key={'user_id': TEMP_USER_ID, 'in_date': today})
    if 'Item' in user_info:
        item = user_info['Item']
        words = item['words']
        if word not in words:
            words.append(word)
            try:
                users_table.put_item(
                    Item={
                        'user_id': TEMP_USER_ID,
                        'in_date': today,
                        'words': words
                    },
                    ConditionExpression='attribute_not_exists(word)'
                )
            except botocore.exceptions.ClientError as e:
                if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                    raise
    else: 
        try:
            users_table.put_item(
                Item={
                    'user_id': TEMP_USER_ID,
                    'in_date': today,
                    'words': [word]
                },
                ConditionExpression='attribute_not_exists(word)'
            )
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                raise

    word_info = words_table.get_item(Key={'word': word})
    
    if 'Item' in word_info:
        item = word_info['Item']
        ret = {
            'statusCode': 200,
            'body': f'[{json.dumps(item)}]'
        }
        return ret

    word_str = query_llm(word.lower())
    word_info = json.loads(word_str)

    try:
        words_table.put_item(
            Item={
                'word': word_info['word'],
                'usages': word_info['usages'],
                "related_information": word_info['related_information'],
                'meanings': word_info['meanings']
            },
            ConditionExpression='attribute_not_exists(word)'
        )
    except botocore.exceptions.ClientError as e:
        if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
            raise

    ret = {
        'statusCode': 200,
        'body': f'[{word_str}]'
    }
    return ret
    
