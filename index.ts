import Redis from "ioredis";
import { v4 as uuid } from "uuid";

const pub = new Redis();
const subReceiver = new Redis();
const subSender = new Redis();

///////////////////////////////
// server

// subscribe to a channel that will receive requests
subReceiver.subscribe("requests", (err) => {
  if (err) {
    console.log("err subscribing to requests", err);
  } else {
    console.log("subscribed to 'requests'");
  }
});

// handle incoming requests
subReceiver.on("message", (channel, message) => {
  // parse the message as JSON
  console.log("handle incoming request:", message);

  const { requestId, payload } = JSON.parse(message);
  const channelName = `responses:${requestId}`;

  // handle the request and send a response
  handleRequest(payload)
    .then((response) => {
      // send the response back on a separate channel
      pub.publish(channelName, JSON.stringify(response));
    })
    .catch((error) => {
      // handle any errors and send an error response back on the same channel
      pub.publish(channelName, JSON.stringify({ error: error.message }));
    });
});

async function handleRequest(payload) {
  await new Promise((resolve) => setTimeout(resolve, 7000));

  return { greeting: "hello, " + payload.name };
}

////////////////////////////////////
// client

// send a request to the server
function sendRequest(payload, timeout = 5000) {
  // create a unique ID for the request
  const requestId = uuid();

  return new Promise((resolve, reject) => {
    const channelName = `responses:${requestId}`;
    // subscribe to the response channel for this request ID
    subSender.subscribe(channelName, (err) => {
      if (err) {
        console.log("error subscribing to", channelName);
      } else {
        console.log("subscribed to", `'responses:${requestId}'`);
      }
    });

    // set a timeout to handle unresponsive servers
    const timeoutId = setTimeout(() => {
      subSender.unsubscribe(channelName);
      reject(new Error("Request timed out"));
    }, timeout);

    // send the request on the requests channel
    const msg = JSON.stringify({ requestId, payload });
    pub.publish("requests", msg);
    console.log("published request on channel 'requests':", msg);

    // handle the response
    subSender.on("message", (channel, message) => {
      if (channel === channelName) {
        // parse the response as JSON
        const response = JSON.parse(message);

        // unsubscribe from the response channel and resolve the promise
        subSender.unsubscribe(channelName);
        clearTimeout(timeoutId);
        resolve(response);
      }
    });

    // handle any errors
    subSender.on("error", (error) => {
      subSender.unsubscribe(channelName);
      clearTimeout(timeoutId);
      reject(error);
    });
  });
}

// example usage
setTimeout(
  () =>
    sendRequest({ name: "ante" }, 10000)
      .then((response) => {
        console.log("Response:", response);
      })
      .catch((error) => {
        console.error("Error:", error);
      }),
  1000
);
// example usage
setTimeout(
  () =>
    sendRequest({ name: "martin" })
      .then((response) => {
        console.log("Response:", response);
      })
      .catch((error) => {
        console.error("Error:", error);
      }),
  2000
);
