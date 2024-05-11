
var callAPI2 = () => {
  word = document.getElementById("new-word").value.trim()
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  var raw = JSON.stringify({ "word": word });
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };
  document.getElementById("new-word").value = "Thinking about " + word + " ...";
  fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
    .then(response => response.text())
    .then(result => recvResponse(JSON.parse(result).body))
    .catch(error => console.log('error', error));
}


//window.onload = function() {
//	callAPI2();
//}


function recvResponse(result) {
  if (result !== "") {
    var chatWindow = document.getElementById("learn-window");
    var messageElement = document.createElement("p");
    let content = '';
    console.log('result = [', result, ']')
    const data = JSON.parse(result);
    data.forEach(item => {
      content += '<div><h3 style="background-color:LightSkyBlue;">' + item.word + '</h3>';
      item.usages.forEach(usage => {
        content += '<li>' + usage + '</li>';
      });
      content += '<p><small>[Related]</small> <strong>' + item.related_information + '</strong></p>';
      content += '<p><small>[Meanings]</small> <strong>' + item.meanings + '</strong></div><hr></p>';
    });
    messageElement.innerHTML = content;
    chatWindow.appendChild(messageElement);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    document.getElementById("new-word").value = "";
  }
}


var callAPI = () => {
  word = document.getElementById("new-word").value.trim()
  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");
  var raw = JSON.stringify({ "word": word });
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw,
    redirect: 'follow'
  };
  document.getElementById("new-word").value = "Thinking about " + word + " ...";
  fetch("https://n2ak6nmytl.execute-api.us-west-2.amazonaws.com/dev/", requestOptions)
    .then(response => response.text())
    .then(result => recvResponse(JSON.parse(result).body))
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

// 페이지 로드 시 기본 탭 열기
document.getElementById("defaultOpen").click();
