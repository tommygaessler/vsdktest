const VideoSDK = window.WebVideoSDK.default

let zmClient = VideoSDK.createClient()
let zmStream
let audioDecode
let audioEncode

// setup your signature endpoint here: https://github.com/zoom/videosdk-sample-signature-node.js
let signatureEndpoint = 'https://or116ttpz8.execute-api.us-west-1.amazonaws.com/default/videosdk'
let sessionName = ''
let sessionPasscode = ''
let userName = 'Participant' + Math.floor(Math.random() * 100)
let role = 1
let userIdentity
let sessionKey
let geoRegions
let cloudRecordingOption
let cloudRecordingElection

zmClient.init('US-en')

function getSignature() {

  document.querySelector('#getSignature').textContent = 'Joining Session...'
  document.querySelector('#getSignature').disabled = true
  document.querySelector('#error').style.display = 'none'

  fetch(signatureEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      sessionName: document.getElementById('sessionName').value || sessionName,
      role: role,
      userIdentity: userIdentity,
      sessionKey: sessionKey,
      geoRegions: geoRegions,
      cloudRecordingOption: cloudRecordingOption,
      cloudRecordingElection: cloudRecordingElection
    })
  }).then((response) => {
    return response.json()
  }).then((data) => {
    joinSession(data.signature)
  }).catch((error) => {
  	console.log(error)
    document.querySelector('#error').style.display = 'block'
    document.querySelector('#error').textContent = 'Something went wrong.'

    document.querySelector('#getSignature').textContent = 'Join Session'
    document.querySelector('#getSignature').disabled = false
  })
}

function joinSession(signature) {
  zmClient.join(document.getElementById('sessionName').value || sessionName, signature, document.getElementById('userName').value || userName, document.getElementById('sessionPasscode').value || sessionPasscode).then((data) => {

    zmStream = zmClient.getMediaStream()

    console.log(zmClient.getSessionInfo())

    if(zmClient.getAllUser().length > 2) {
      document.querySelector('#error').style.display = 'block'
      document.querySelector('#error').textContent = 'Session full.'
      setTimeout(() => {
        leaveSession()
      }, 1000)
    } else {
      document.querySelector('#session').style.display = 'flex'
      document.querySelector('#landing').style.display = 'none'

      if(zmClient.getAllUser().length > 1) {
        document.querySelector('#participant-name').textContent = zmClient.getAllUser()[1].displayName
      }

      addEventListeners()
    }
  }).catch((error) => {
    console.log(error)
    document.querySelector('#error').style.display = 'block'
    document.querySelector('#error').textContent = error.reason

    document.querySelector('#getSignature').textContent = 'Join Session'
    document.querySelector('#getSignature').disabled = false
  })
}

function startVideo() {
  document.querySelector('#startVideo').textContent = 'Starting Video...'
  document.querySelector('#startVideo').disabled = true

  if(zmStream.isRenderSelfViewWithVideoElement()) {
    zmStream.startVideo({ videoElement: document.querySelector('#self-view-video'), mirrored: true, hd: true }).then(() => {
      document.querySelector('#self-view-video').style.display = 'block'
      document.querySelector('#self-view-name').style.display = 'none'

      document.querySelector('#startVideo').style.display = 'none'
      document.querySelector('#stopVideo').style.display = 'inline-block'

      document.querySelector('#startVideo').textContent = 'Start Video'
      document.querySelector('#startVideo').disabled = false
    }).catch((error) => {
      console.log(error)
    })
  } else {
    zmStream.startVideo({ mirrored: true,  hd: true }).then(() => {
      zmStream.renderVideo(document.querySelector('#self-view-canvas'), zmClient.getCurrentUserInfo().userId, 1920, 1080, 0, 0, 3).then(() => {
        document.querySelector('#self-view-canvas').style.display = 'block'
        document.querySelector('#self-view-name').style.display = 'none'

        document.querySelector('#startVideo').style.display = 'none'
        document.querySelector('#stopVideo').style.display = 'inline-block'

        document.querySelector('#startVideo').textContent = 'Start Video'
        document.querySelector('#startVideo').disabled = false
      }).catch((error) => {
        console.log(error)
      })
    }).catch((error) => {
      console.log(error)
    })
  }
}

function stopVideo() {
  zmStream.stopVideo()
  document.querySelector('#self-view-canvas').style.display = 'none'

  document.querySelector('#self-view-video').style.display = 'none'
  document.querySelector('#self-view-name').style.display = 'block'

  document.querySelector('#startVideo').style.display = 'inline-block'
  document.querySelector('#stopVideo').style.display = 'none'
}

function startAudio() {

  var isSafari = window.safari !== undefined

  if(isSafari) {
    console.log('desktop safari')
    if(audioDecode && audioEncode){
      zmStream.startAudio()
      document.querySelector('#startAudio').style.display = 'none'
      document.querySelector('#muteAudio').style.display = 'inline-block'
    } else {
      console.log('desktop safari audio init has not finished')
    }
  } else {
    console.log('not desktop safari')
    zmStream.startAudio()
    document.querySelector('#startAudio').style.display = 'none'
    document.querySelector('#muteAudio').style.display = 'inline-block'
  }
}

function muteAudio() {
  zmStream.muteAudio()

  document.querySelector('#muteAudio').style.display = 'none'
  document.querySelector('#unmuteAudio').style.display = 'inline-block'
}

function unmuteAudio() {
  zmStream.unmuteAudio()

  document.querySelector('#muteAudio').style.display = 'inline-block'
  document.querySelector('#unmuteAudio').style.display = 'none'
}

function leaveSession() {
  zmClient.leave()

  removeEventListeners()

  document.querySelector('#session').style.display = 'none'
  document.querySelector('#muteAudio').style.display = 'none'
  document.querySelector('#unmuteAudio').style.display = 'none'
  document.querySelector('#stopVideo').style.display = 'none'
  document.querySelector('#self-view-video').style.display = 'none'
  document.querySelector('#participant-canvas').style.display = 'none'
  document.querySelector('#self-view-canvas').style.display = 'none'

  document.querySelector('#startVideo').style.display = 'inline-block'
  document.querySelector('#startAudio').style.display = 'inline-block'
  document.querySelector('#self-view-name').style.display = 'block'

  document.querySelector('#participant-name').textContent = '⏳ Waiting for participant to join...'
  document.querySelector('#getSignature').textContent = 'Join Session'
  document.querySelector('#getSignature').disabled = false
  document.querySelector('#startVideo').textContent = 'Start Video'
  document.querySelector('#startVideo').disabled = false

  document.querySelector('#landing').style.display = 'flex'
}

let connectionChange = ((payload) => {
  console.log(payload)

  if(payload.state === 'Reconnecting') {
    document.querySelector('#participant-name').textContent = 'Lost connection, trying to reconnect...'
  } else if(payload.state === 'Fail') {
    document.querySelector('#participant-name').textContent = 'Disconnected.'

    leaveSession()
  } else if(payload.state === 'Connected') {
    if(zmClient.getAllUser().length > 1) {
      document.querySelector('#participant-name').textContent = zmClient.getAllUser()[1].displayName
    } else {
      document.querySelector('#participant-name').textContent = '⏳ Waiting for participant to join...'
    }
  }
})

let mediaSdkChange = ((payload) => {
  console.log(payload)
  const { action, type, result } = payload
  if (type === 'audio' && result === 'success') {
    if (action === 'encode') {
      audioEncode = true
    } else if (action === 'decode') {
      audioDecode = true
    }
  }
})

let userAdded = ((payload) => {

  if(zmClient.getAllUser().length < 3) {
    if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
      document.querySelector('#participant-name').textContent = payload[0].displayName
    }
  }
})

let userUpdated = ((payload) => {
  console.log(payload)

  if(payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
    
    if(payload[0].hasOwnProperty('bVideoOn') && payload[0].bVideoOn === true) {
      zmStream.renderVideo(document.querySelector('#participant-canvas'), payload[0].userId, 1920, 1080, 0, 0, 3).then(() => {
        document.querySelector('#participant-canvas').style.display = 'block'
        document.querySelector('#participant-name').style.display = 'none'
      })
    } else if(payload[0].hasOwnProperty('bVideoOn') && payload[0].bVideoOn === false) {
      zmStream.stopRenderVideo(document.querySelector('#participant-canvas'), payload[0].userId).then(() => {
        document.querySelector('#participant-canvas').style.display = 'none'
        document.querySelector('#participant-name').style.display = 'block'
      })
    }
  }
})

let userRemoved = ((payload) => {
  console.log(payload)
  if(zmClient.getAllUser().length < 2) {
    if(payload.length && payload[0].userId !== zmClient.getCurrentUserInfo().userId) {
      document.querySelector('#participant-name').textContent = 'Participant left...'

      zmStream.stopRenderVideo(document.querySelector('#participant-canvas'), payload[0].userId).then(() => {
        document.querySelector('#participant-canvas').style.display = 'none'
        document.querySelector('#participant-name').style.display = 'block'
      })
    }
  }
})

function addEventListeners() {
  zmClient.on('media-sdk-change', mediaSdkChange)
  zmClient.on('connection-change', connectionChange)
  zmClient.on('user-added', userAdded)
  zmClient.on('user-updated', userUpdated)
  zmClient.on('user-removed', userRemoved)
}

function removeEventListeners() {
  zmClient.off('media-sdk-change', mediaSdkChange)
  zmClient.off('connection-change',connectionChange)
  zmClient.off('user-added', userAdded)
  zmClient.off('user-updated', userUpdated)
  zmClient.off('user-removed', userRemoved)
}