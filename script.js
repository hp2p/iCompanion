
const DB_NAME = "words_db";
const TABLE_NAME = "words_table";
const INDEX_NAME = "words_index";

const TODAY = new Date().toISOString().slice(0, 10);

let db;
function getWordFromDb(word)
{
    let objectStore = db.transaction([TABLE_NAME], "readonly").objectStore(TABLE_NAME);
    let index = objectStore.index(INDEX_NAME);
    let getRequest = index.get(word);

    let result = null;
    getRequest.onsuccess = function(event) {
        result = event.target.result;
        console.log('getWordFromDb ok', result);
    };

    getRequest.onerror = function(event) {
        console.log('getWordFromDb', event);
    }
    return result;
}

function addWordToDb(word, info)
{
    const newWord = {word: word, info: info, date: TODAY};
    const transaction = db.transaction( [ TABLE_NAME ], 'readwrite' );

    transaction.onerror = function(event) {
        console.log('addWordToDb transaction.onerror ', event);
    };

    const objectStore = transaction.objectStore( TABLE_NAME );

    const query = objectStore.add(newWord);

    query.onerror = function(event) {
        console.log('addWordToDb query.onerror ', event);
    };
}

function recvResponse(raw_result, local_request) 
{
    console.log('recvResponse: local_request = ', local_request);

    parsed_result = JSON.parse(raw_result);
    if (parsed_result.body !== "") 
    {
        if(parsed_result.requestType == "new-word") 
        {
            const data = JSON.parse(parsed_result.body);

            if(local_request == false)
            {
                addWordToDb(data['word'], raw_result);
            }
  
            let chatWindow = document.getElementById("learn-window");
            let messageElement = document.createElement("p");
            let content = '';
  
            content += '<div><h3 style="background-color:LightSkyBlue;font-size:1.5em;">&nbsp;&nbsp;' + data['word'] + '</h3>';
            data['usages'].forEach(usage => 
            {
                content += '<li>' + usage + '</li>';
            });
            content += '<p><small>[Related]</small> <strong>' + data['related_information'] + '</strong></p>';
            content += '<p><small>[Meanings]</small> <strong>' + data['meanings'] + '</strong></div></p>';
  
            messageElement.innerHTML = content;
            //chatWindow.appendChild(messageElement);
            chatWindow.insertBefore(messageElement, chatWindow.firstChild);
            chatWindow.scrollTop = chatWindow.scrollHeight;
            document.getElementById("new-word").value = "";
        }
        else if(parsed_result.requestType == "story") 
        {
            let storyWindow = document.getElementById("story-window");
            let messageElement = document.createElement("p");
            content = parsed_result.body;
            messageElement.innerHTML = content;
            storyWindow.appendChild(messageElement);

            if(local_request == false)
            {
                localStorage.setItem("story_date", TODAY);
                localStorage.setItem("story", raw_result);
            }
        }
    }
}

function callAPI(requestType) 
{
    if(requestType == "new-word") 
    {
        let word = document.getElementById("new-word").value.trim()
        word = word.toLowerCase();

        let objectStore = db.transaction([TABLE_NAME], "readonly").objectStore(TABLE_NAME);
        let index = objectStore.index(INDEX_NAME);
        let getRequest = index.get(word);

        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");

        let requestOptions = 
        {
            method: 'POST',
            headers: myHeaders,
            body: null,
            redirect: 'follow'
        };

        let body_str = { "requestType": "new-word", "word": word };
        getRequest.onsuccess = function(event) 
        {
            let result = event.target.result;
            if(result)
            {
                recvResponse(result['info'], local_request = true);
                body_str["requestType"] = "new-word-local";
            }

            requestOptions['body'] = JSON.stringify(body_str);
            fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
                .then(response => response.text())
                .then(result => recvResponse(result, local_request = false) )
                .catch(error => console.log('error', error));
        };

        getRequest.onerror = function(event) 
        {
            console.log('getWordFromDb.onerror', event);
            requestOptions['body'] = JSON.stringify(body_str);

            fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
                .then(response => response.text())
                .then(result => recvResponse(result, local_request = false) )
                .catch(error => console.log('fetch.catch.error', error));
        };
        document.getElementById("new-word").value = "Thinking about " + word + " ...";
    }
    else if(requestType == "story") 
    {
        let story_date = localStorage.getItem("story_date");
        if(story_date == TODAY)
        {
            story = localStorage.getItem("story");
            recvResponse(story, local_request = true);
            return;
        }

        let myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        let raw = JSON.stringify({ "requestType": "story" });
        var requestOptions = 
        {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };
        fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
            .then(response => response.text())
            .then(result => recvResponse(result, local_request = false) )
            .catch(error => console.log('story fetch.catch error', error));
    }
}


function request_old_word(old_word)
{
    document.getElementById("new-word").value = old_word;
    callAPI('new-word');
    document.getElementById("defaultOpen").click();
}


function openTab(evt, tabName) 
{
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}


function load_story() {
    callAPI("story");
}


// 페이지 로드 시 기본 탭 열기
document.getElementById("defaultOpen").click();

const dbopen_request = window.indexedDB.open(DB_NAME, 1);

dbopen_request.onupgradeneeded = function(event) 
{
    db = event.target.result;

    console.log('dbopen_request.onsuccess', db);

    db.onerror = function(event) 
    {
        console.log('onupgradeneeded db.onerror: ', event);
    };

    if( ! db.objectStoreNames.contains(TABLE_NAME)) 
    {
        let table = db.createObjectStore(TABLE_NAME, {keyPath: 'id', autoIncrement:true});
        table.createIndex(INDEX_NAME, "word", {unique: false});
        table.onerror = function(event) {
            console.log('onupgradeneeded table.onerror: ', event);
        }
    }
}

dbopen_request.onsuccess = function(event) {
    db = event.target.result;
    console.log('dbopen_request.onsuccess', db);

    const transaction = db.transaction( [ TABLE_NAME ], 'readonly' );

    transaction.onerror = function(event) 
    {
        console.log('dbopen_request.onsuccess transaction.onerror ', event);
    };
    const objectStore = transaction.objectStore( TABLE_NAME );
    const request = objectStore.openCursor(null, "prev");
    request.onsuccess = function(event) 
    {
        console.log('request.onsuccess in dbopen_request.onsuccess');
        const cursor = event.target.result;
        if(cursor)
        {
            if(cursor.value['date'] == TODAY)
            {
                recvResponse(cursor.value['info'], local_request = true);
                cursor.continue();
            }
        }
    }
}

dbopen_request.onerror = function(event) {
    console.log('dbopen_request onerror', event);
};

