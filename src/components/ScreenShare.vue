<template>
  <div class="screen-share">
    <div class="info-panel">
      <div v-if="localIp" class="connection-info">
        手机扫描访问: 
        <QRCode :value="viewerUrl" :size="200" class="qr-code" />
        <div class="url">{{ viewerUrl }}</div>
      </div>
      <div class="status">
        状态: {{ isSharing ? '共享中' : '未共享' }}
      </div>
    </div>

    <div class="control-panel">
      <button 
        @click="startSharing" 
        :disabled="isSharing"
        class="btn start"
      >
        开始共享
      </button>
      <button 
        @click="stopSharing" 
        :disabled="!isSharing"
        class="btn stop"
      >
        停止共享
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import QRCode from 'qrcode.vue'

// 声明全局类型
declare global {
  interface Window {
    electronAPI: {
      getDesktopSources: (options: any) => Promise<Electron.DesktopCapturerSource[]>
      getLocalIP: () => string
    }
  }
}

const localIp = ref('')
const isSharing = ref(false)
let mediaRecorder: MediaRecorder | null = null
let ws: WebSocket | null = null
let captureInterval: number | null = null // 用于存储重试定时器

const viewerUrl = computed(() => {
  return `http://${localIp.value}:3000/viewer`
})

// 在 preload 中获取本地IP
onMounted(async () => {
  localIp.value = await window.electronAPI.getLocalIP()
})

const startSharing = async () => {
  try {
    await setupScreenShare()
  } catch (error) {
    console.error('共享失败:', error)
  }
}

const setupScreenShare = async () => {
  const sources = await window.electronAPI.getDesktopSources({ 
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })
  
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sources[0].id,
        maxWidth: 1920,
        maxHeight: 1080
      }
    } as any
  })

  // 监控视频轨道的状态
  const videoTrack = stream.getVideoTracks()[0]
  videoTrack.onended = () => {
    console.log('视频轨道已结束，尝试重新获取...')
    handleStreamEnded()
  }
  
  // 监控黑屏
  startBlackScreenDetection(stream)

  ws = new WebSocket(`ws://${localIp.value}:3000`)
  
  ws.onopen = () => {
    console.log('WebSocket 已连接')
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 1500000
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
        ws.send(event.data)
      }
    }

    mediaRecorder.start(100)
    isSharing.value = true
  }

  ws.onerror = (error) => {
    console.error('WebSocket 错误:', error)
    stopSharing()
  }
}

// 检测黑屏
const startBlackScreenDetection = (stream: MediaStream) => {
  const video = document.createElement('video')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  video.srcObject = stream
  video.play()

  canvas.width = 100  // 使用小尺寸以提高性能
  canvas.height = 100

  const checkBlackScreen = () => {
    if (!ctx) return
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // 检查是否全黑或接近全黑
    let isBlack = true
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r > 10 || g > 10 || b > 10) {
        isBlack = false
        break
      }
    }

    if (isBlack) {
      console.log('检测到黑屏，尝试重新获取...')
      handleStreamEnded()
    }
  }

  // 每秒检查一次黑屏
  captureInterval = window.setInterval(checkBlackScreen, 1000)
}

const handleStreamEnded = async () => {
  // 停止当前的共享
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  
  // 等待一小段时间后重试
  await new Promise(resolve => setTimeout(resolve, 500))
  
  try {
    await setupScreenShare()
  } catch (error) {
    console.error('重新获取屏幕共享失败:', error)
  }
}

const stopSharing = () => {
  if (captureInterval) {
    clearInterval(captureInterval)
    captureInterval = null
  }
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  
  if (ws) {
    ws.close()
  }
  
  isSharing.value = false
}

// 组件卸载时清理
onUnmounted(() => {
  stopSharing()
})
</script>

<style scoped>
.screen-share {
  padding: 20px;
}

.info-panel {
  margin-bottom: 20px;
}

.connection-info {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.qr-code {
  margin: 10px auto;
}

.url {
  word-break: break-all;
  color: #666;
}

.control-panel {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start {
  background: #4CAF50;
  color: white;
}

.stop {
  background: #f44336;
  color: white;
}
</style> 