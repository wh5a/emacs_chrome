/*
 * xmlcomms.js
 *
 * This handles making XMLHttp calls to the "Edit Server"
 *
 * As no other parts of the extension can make xhr requests this
 * is essentially the gatekeeper to all contact with the Edit
 * Server.
 *
 * This file is part of emacs_chrome (http://github.com/stsquad/emacs_chrome)
 * and licensed under the GPLv3. See the COPYING file for details
 */

// Get the base URL from which we make all requests to the server..
function getEditUrl()
{
    var port = localStorage["edit_server_port"];
    if (!port) {
	port = 9292;
    }
    return "http://127.0.0.1:" +  port + "/";
}

/*
 * Give some feedback to the user via the icon/hover text.
 */
function updateUserFeedback(string, redIcon)
{
  return;
    console.log("updateUserFeedback: "+string);
    chrome.browserAction.setTitle({title:string});
    if (redIcon) {
	chrome.browserAction.setIcon({path:"emacs23-16x16-red.png"});
    } else {
    	chrome.browserAction.setIcon({path:"emacs23-16x16.png"});
    }
}
    
// Handle and edit request coming from the content page script
//
// Package up the text to be edited and send it to the edit server
function handleContentMessages(msg, tab_port)
{
//    console.log("handleContentMessages called:"+JSON.stringify(msg));
    var cmd = msg.msg;
    var id = msg.id;

    var xhr = new XMLHttpRequest();
    var url = getEditUrl() + cmd + "/" + id;

    console.log(" page URL:"+tab_port.tab.url);
    console.log(" tab_port:"+tab_port.portId_);
    console.log(" request URL:"+url);
    
    xhr.open("POST", url, true);
    
    xhr.onreadystatechange = function() {
        console.log("State change:"+ xhr.readyState + " status:"+xhr.status);
	// readyState 4=HTTP response complete
        if(xhr.readyState == 4) {
	    if (xhr.status == 200) {
		
		var update_msg = {
		    msg: "update",
		    text: xhr.responseText,
		    id: id
		};

		updateUserFeedback("Last Edit request a success", false);
		tab_port.postMessage(update_msg);
	    } else if (xhr.status == 0) {
		// Is the edit server actually running?
		updateUserFeedback("Error: is edit server running?", true);
	    } else {
		updateUserFeedback("Un-handled response: "+xhr.status, true); 
	    }
        }
    }

    // reset the display before sending request..
    updateUserFeedback("Edit request sent", false);

    xhr.setRequestHeader("Content-type", "text/plain");
    xhr.send(JSON.stringify({
      height: msg.clientHeight,
      width: msg.clientWidth,
      text: msg.text
    }));
}

// Handle and edit request coming from the content page script
//
// Package up the text to be edited and send it to the edit server
function handleTestMessages(msg, tab_port)
{
    var url = getEditUrl() + "status";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
	console.log("State change:"+ xhr.readyState + " status:"+xhr.status);
	// readyState 4=HTTP response complete
	if(xhr.readyState == 4) {
	    if (xhr.status == 200) {
		tab_port.postMessage({msg: "test_result", text: xhr.responseText});
	    } else if (xhr.status == 0) {
		tab_port.postMessage({msg: "test_result", text: "Edit Server Test failed: is it running?"});
	    } else {
		tab_port.postMessage({msg: "test_result", text: "Un-handled response: "+xhr.status}); 
	    }
	}
    }
    xhr.send();
}

/*
  Handle all in-coming messages to the extension.

  As other parts of the extension cannot trigger XHR requests they all
  send message to the main part of the extension to service these requests.
*/
 
function localMessageHandler(port)
{
    port.onMessage.addListener(function(msg, port) {
        if (msg.msg == "edit") {
	handleContentMessages(msg,port);
	} else if (msg.msg == "test") {
	    handleTestMessages(msg, port);
	}
    });
}

// Hook up whenever someone connects to the extension comms port
chrome.extension.onConnect.addListener(localMessageHandler);
