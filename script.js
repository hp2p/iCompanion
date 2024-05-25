const DB_NAME = "words_db";
const TABLE_NAME = "words_table";
const INDEX_NAME = "words_index";
const STORY_TABLE_NAME = "story_table";

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
    const newWord = {word: word, info: info};
    const transaction = db.transaction( [ TABLE_NAME ], 'readwrite' );

    console.log('addWordToDb: ', word, info);

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
    console.log('raw_result= [', raw_result, ']');
    console.log('local_request = ', local_request);

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
  
            content += '<div><h3 style="background-color:LightSkyBlue;">' + data['word'] + '</h3>';
            data['usages'].forEach(usage => 
            {
                content += '<li>' + usage + '</li>';
            });
            content += '<p><small>[Related]</small> <strong>' + data['related_information'] + '</strong></p>';
            content += '<p><small>[Meanings]</small> <strong>' + data['meanings'] + '</strong></div><hr></p>';
  
            messageElement.innerHTML = content;
            chatWindow.appendChild(messageElement);
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
        }
    }
}


function callAPI(requestType) 
{
    if(requestType == "new-word") 
    {
        let word = document.getElementById("new-word").value.trim()

        let objectStore = db.transaction([TABLE_NAME], "readonly").objectStore(TABLE_NAME);
        let index = objectStore.index(INDEX_NAME);
        let getRequest = index.get(word);

        getRequest.onsuccess = function(event) 
        {
            let result = event.target.result;
            if(result)
            {
                recvResponse(result['info'], local_request = true);
                return;
            }
            else
            {
                let myHeaders = new Headers();
                myHeaders.append("Content-Type", "application/json");
                let raw = JSON.stringify({ "requestType": "new-word", "word": word });
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
                    .catch(error => console.log('error', error));
            }
        };

        getRequest.onerror = function(event) {
            console.log('getWordFromDb', event);
            let myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");
            let raw = JSON.stringify({ "requestType": "new-word", "word": word });
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
                .catch(error => console.log('error', error));
        };

        document.getElementById("new-word").value = "Thinking about " + word + " ...";
    }
    else if(requestType == "story") 
    {
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
            .catch(error => console.log('error', error));
    }

}


function openTab(evt, tabName) {
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
    // callAPI("story");
}


// 페이지 로드 시 기본 탭 열기
document.getElementById("defaultOpen").click();

const dbopen_request = window.indexedDB.open(DB_NAME, 1);

dbopen_request.onupgradeneeded = function(event) {
    db = event.target.result;

    console.log('dbopen_request.onsuccess', db);

    db.onerror = function(event) {
        console.log('onupgradeneeded db.onerror: ', event);
    };

    if( ! db.objectStoreNames.contains(TABLE_NAME)) {
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
}

dbopen_request.onerror = function(event) {
    console.log('dbopen_request onerror', event);
};

