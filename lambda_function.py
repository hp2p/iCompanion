import json
import boto3
import botocore
from datetime import datetime, timedelta
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
    
    
def query_new_word_to_llm(word):
    client = OpenAI( api_key=get_api_key() )
    user_prompt = f'''I want to memorize the meanings and usages of the vocabulary "{word}".
Create a json string including 3 short usage samples including "{word}", 
related information helpful to memorize "{word}" in Korean, 
and dictionary meanings of "{word}" in Korean. 
Remember that if the "{word}" is not a valid English vocabulary, use the closest word to "{word}".
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

def handle_new_word(word, today, local_request):
    user_info = users_table.get_item(Key={'user_id': TEMP_USER_ID, 'in_date': today})
    if 'Item' in user_info:
        item = user_info['Item']
        words = item['words']
        if word not in words:
            words.append(word)
            try:
                users_table.update_item(
                    Key={'user_id': TEMP_USER_ID, 'in_date': today},
                    UpdateExpression="set words=:new_words",
                    ExpressionAttributeValues={":new_words": words}
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
                    'words': [word],
                    'story': ''
                },
                ConditionExpression='attribute_not_exists(word)'
            )
        except botocore.exceptions.ClientError as e:
            if e.response['Error']['Code'] != 'ConditionalCheckFailedException':
                raise

    if local_request:
        return ''
                
    word_info = words_table.get_item(Key={'word': word})
    
    if 'Item' in word_info:
        item = word_info['Item']
        ret = f'{json.dumps(item)}'
        return ret

    word_str = query_new_word_to_llm(word)
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

    return word_str
    
    
def past_word_list(userid):
    date_deltas = [1, 3, 7, 14, 28]
    words = []
    
    for date_delta in date_deltas:
        tm = (datetime.today() - timedelta(days=date_delta)).strftime('%Y%m%d')
    
        user_info = users_table.get_item(Key={'user_id': userid, 'in_date': tm})
        if 'Item' in user_info:
            item = user_info['Item']
            for w in item['words']:
                if w not in words:
                    words.append(w)
    return words


def query_story_to_llm(words):
    client = OpenAI( api_key=get_api_key() )
    words = ','.join(words)
    user_prompt = f'''Tell me a middle school level short story that inclus the following words.
{words}
No other explanations.
'''
   
    completion = client.chat.completions.create(
        model='gpt-4o',
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
        max_tokens=512,
        top_p=1,
        frequency_penalty=0.0,
        presence_penalty=0.0
        )
    
    response = completion.choices[0].message.content
    return response
    
def format_story(story):
    story = story.replace('. ', '.<hr/>')
    story = story.replace('Mr.<hr/>', 'Mr.').replace('Mrs.<hr/>', 'Mrs.').replace('Ms.<hr/>', 'Ms.').replace('Dr.<hr/>', 'Dr.')
    return story
    
    
def handle_story(today):
    user_info = users_table.get_item(Key={'user_id': TEMP_USER_ID, 'in_date': today})
    if ('Item' in user_info) and ('story' in user_info['Item']):
        return format_story(user_info['Item']['story'])

    words = past_word_list(TEMP_USER_ID)
    story = query_story_to_llm(words)
    
    res = ''
    for w in words:
        res += f'''<a href="#" onclick="request_old_word('{w}'); return false;">{w}</a>, '''
    story = story + '<hr/> <hr/>' + res
    
    if 'Item' in user_info:
        try:
            users_table.update_item(
                Key={'user_id': TEMP_USER_ID, 'in_date': today},
                UpdateExpression="set story=:new_story",
                ExpressionAttributeValues={":new_story": story}
            )
            
        except botocore.exceptions.ClientError as e:
            return f"Couldn't update item in table {users_table.name}." \
                + f" Here's why: {e.response['Error']['Code']}: {e.response['Error']['Message']}" \
                + "<hr/>" + story
    else:
        try:
            users_table.put_item(
                Item={
                    'user_id': TEMP_USER_ID,
                    'in_date': today,
                    'words': [],
                    'story': story
                },
                ConditionExpression='attribute_not_exists(word)'
            )
            
        except botocore.exceptions.ClientError as e:
            return f"Couldn't put item in table {users_table.name}." \
                + f" Here's why: {e.response['Error']['Code']}: {e.response['Error']['Message']}" \
                + "<hr/>" + story
    
    return format_story(story)


def lambda_handler(event, context):

    requestType = event['requestType']
    today = datetime.today().strftime('%Y%m%d')
    if 'word' in event:
        word = event['word'].lower()
    
    if requestType == 'new-word':
        word_str = handle_new_word(word, today, local_request = False)
    elif requestType == 'new-word-local':
        word_str = handle_new_word(word, today, local_request = True)
    elif requestType == 'story':
        word_str = handle_story(today)

    ret = {
        'statusCode': 200,
        'body': f'{word_str}',
        'requestType': requestType
    }
    return ret
