
function recvResponse(raw_result, parsed_result) {
  console.log('raw_result= [', raw_result, ']');
  if (parsed_result.body !== "") {
    if(parsed_result.requestType == "new-word") {
      const data = JSON.parse(parsed_result.body);
  
      let chatWindow = document.getElementById("learn-window");
      let messageElement = document.createElement("p");
      let content = '';
  
      content += '<div><h3 style="background-color:LightSkyBlue;">' + data['word'] + '</h3>';
      data['usages'].forEach(usage => {
          content += '<li>' + usage + '</li>';
      });
      content += '<p><small>[Related]</small> <strong>' + data['related_information'] + '</strong></p>';
      content += '<p><small>[Meanings]</small> <strong>' + data['meanings'] + '</strong></div><hr></p>';
  
      messageElement.innerHTML = content;
      chatWindow.appendChild(messageElement);
      chatWindow.scrollTop = chatWindow.scrollHeight;
      document.getElementById("new-word").value = "";
    }
    else if(parsed_result.requestType == "story") {
      let storyWindow = document.getElementById("story-window");
      let messageElement = document.createElement("p");
      content = parsed_result.body;
      messageElement.innerHTML = content;
      storyWindow.appendChild(messageElement);
    }
  }
}


var callAPI = (requestType) => {

  if(requestType == "new-word") {

    let word = document.getElementById("new-word").value.trim()
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let raw = JSON.stringify({ "requestType": "new-word", "word": word });
    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };
    document.getElementById("new-word").value = "Thinking about " + word + " ...";
  }
  else if(requestType == "story") {

    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let raw = JSON.stringify({ "requestType": "story" });
    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };
  }

  fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
    .then(response => response.text())
    .then(result => recvResponse(result, JSON.parse(result)))
    .catch(error => console.log('error', error));
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
    callAPI("story");
}


// 페이지 로드 시 기본 탭 열기
document.getElementById("defaultOpen").click();


