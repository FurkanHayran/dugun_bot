import { useRef, useState } from 'react'
import { ArrowUpRight, Camera, Check, Film, ImagePlus, LoaderCircle, LockKeyhole, Sparkles, X } from 'lucide-react'

const MAX_VIDEO_SIZE = 40 * 1024 * 1024
const MAX_IMAGE_EDGE = 2400
const telegramToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8810293787:AAHbLLJluWmAKj0OInT0cEt2tWxOaTnq3y8'
const telegramChatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || '-1003901888747'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const sourceUrl = URL.createObjectURL(file)
    image.onload = () => {
      const ratio = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(sourceUrl)
        if (!blob) return reject(new Error('Görsel sıkıştırılamadı.'))
        resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.82)
    }
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(new Error('Görsel okunamadı.'))
    }
    image.src = sourceUrl
  })
}

async function sendToTelegram(file) {
  if (!telegramToken || !telegramChatId) throw new Error('Telegram bağlantı ayarları bulunamadı.')
  const body = new FormData()
  body.append('chat_id', telegramChatId)
  body.append('document', file, file.name)
  body.append('caption', `Düğün anısı: ${file.name}`)
  const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, { method: 'POST', body })
  if (!response.ok) {
    let errorMessage = 'Telegram gönderimi başarısız oldu.'
    try {
      const errorBody = await response.json()
      if (errorBody.description) errorMessage = `Telegram: ${errorBody.description}`
    } catch {
      // Keep the generic message when Telegram does not return JSON.
    }
    throw new Error(errorMessage)
  }
}

function App() {
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [queue, setQueue] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [sentCount, setSentCount] = useState(0)
  const [message, setMessage] = useState(null)

  const chooseFiles = (event) => {
    const picked = [...event.target.files]
    const rejected = picked.filter((file) => file.type.startsWith('video/') && file.size >= MAX_VIDEO_SIZE)
    const accepted = picked.filter((file) => !(file.type.startsWith('video/') && file.size >= MAX_VIDEO_SIZE))
    if (rejected.length) setMessage({ type: 'error', text: '40 MB üzerindeki büyük videoları alamıyoruz. Lütfen daha kısa bir video seçin veya sadece fotoğraf yükleyin.' })
    if (accepted.length) {
      setQueue((current) => [...current, ...accepted.map((file) => ({ file, status: 'waiting' }))])
      if (!rejected.length) setMessage(null)
    }
    event.target.value = ''
  }

  const removeFile = (index) => setQueue((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const uploadQueue = async () => {
    if (!queue.length || isSending) return
    setIsSending(true)
    setSentCount(0)
    setMessage(null)
    for (let index = 0; index < queue.length; index += 1) {
      setQueue((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'sending' } : item))
      try {
        const currentFile = queue[index].file
        await sendToTelegram(currentFile.type.startsWith('image/') ? await compressImage(currentFile) : currentFile)
        setQueue((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'sent' } : item))
        setSentCount((count) => count + 1)
      } catch (error) {
        setQueue((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, status: 'error' } : item))
        setMessage({ type: 'error', text: error.message })
        break
      }
    }
    setIsSending(false)
  }

  const progress = queue.length ? Math.round((sentCount / queue.length) * 100) : 0
  const completed = queue.length > 0 && sentCount === queue.length

  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <div className="grain" />
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3"><span className="brand-mark"><Sparkles size={16} /></span><span className="font-display text-lg tracking-tight">bizim günümüz</span></div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/50"><LockKeyhole size={14} /> sadece davetliler</div>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-14 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:pb-24 lg:pt-20">
        <div className="max-w-xl animate-rise">
          <p className="eyebrow">20 Ağustos 2026 · Sivas</p>
          <h1 className="font-display mt-5 text-6xl leading-[.92] tracking-[-0.055em] sm:text-8xl">Anılarınızı<br /><em>burada</em> bırakın.</h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-ink/65">Bugün bizimle paylaştığınız her kare, yıllar sonra açacağımız en güzel albümün bir parçası olacak.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4 text-sm text-ink/55"><span className="flex items-center gap-2"><ImagePlus size={17} /> fotoğraf</span><span className="h-1 w-1 rounded-full bg-coral" /><span className="flex items-center gap-2"><Film size={17} /> video</span></div>
        </div>

        <div className="upload-panel animate-rise-delayed">
          <div className="corner-label">anı kutusu / 01</div>
          <div className="upload-icon"><Camera size={27} strokeWidth={1.5} /></div>
          <h2 className="font-display mt-6 text-3xl tracking-tight">Kareyi seçin</h2>
          <p className="mt-2 text-sm leading-6 text-ink/55">Galerinizden birden fazla fotoğraf veya video ekleyebilirsiniz.</p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
            <button className="primary-button" onClick={() => galleryInputRef.current?.click()} disabled={isSending}><ImagePlus size={18} /> galeriden seçin <ArrowUpRight size={17} /></button>
            <button className="secondary-button camera-button" onClick={() => cameraInputRef.current?.click()} disabled={isSending}><Camera size={17} /> kamerayı aç</button>
          </div>
          <input ref={galleryInputRef} type="file" className="hidden" accept="video/*,image/*" multiple onChange={chooseFiles} />
          <input ref={cameraInputRef} type="file" className="hidden" accept="video/*,image/*" capture="environment" multiple onChange={chooseFiles} />
          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.12em] text-ink/40">Videolar 40 MB altında olmalı</p>
        </div>
      </section>

      {message && <div className={`notice relative z-10 mx-auto mb-6 max-w-6xl px-6 lg:px-10 ${message.type === 'error' ? 'notice-error' : ''}`}>{message.text}</div>}

      {queue.length > 0 && <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 lg:px-10">
        <div className="queue-head"><div><p className="eyebrow">yükleme kuyruğu</p><h2 className="font-display mt-2 text-3xl">{completed ? 'Hepsi albümde.' : `${queue.length} anı hazır`}</h2></div><span className="progress-number">{progress}%</span></div>
        <div className="progress-track mt-5"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{queue.map((item, index) => <div className="file-row" key={`${item.file.name}-${index}`}><div className="file-type">{item.file.type.startsWith('video/') ? <Film size={18} /> : <ImagePlus size={18} />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.file.name}</p><p className="mt-1 text-xs text-ink/45">{formatSize(item.file.size)} · {item.status === 'sending' ? 'gönderiliyor...' : item.status === 'sent' ? 'gönderildi' : item.status === 'error' ? 'başarısız' : 'bekliyor'}</p></div>{item.status === 'sending' ? <LoaderCircle className="animate-spin text-coral" size={18} /> : item.status === 'sent' ? <Check className="text-green" size={18} /> : !isSending && <button className="icon-button" title="Kuyruktan kaldır" onClick={() => removeFile(index)}><X size={16} /></button>}</div>)}</div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center"><button className="primary-button" onClick={uploadQueue} disabled={isSending || completed}>{isSending ? <><LoaderCircle className="animate-spin" size={18} /> anılar gönderiliyor</> : completed ? <><Check size={18} /> başarıyla gönderildi</> : <>hepsini gönder <ArrowUpRight size={17} /></>}</button>{!isSending && <button className="secondary-button" onClick={() => { setQueue([]); setSentCount(0) }}>kuyruğu temizle</button>}</div>
      </section>}
      <footer className="relative z-10 border-t border-ink/10 px-6 py-6 text-center text-xs text-ink/40">Bu günün küçük bir parçasını bizimle paylaştığınız için teşekkürler.</footer>
    </main>
  )
}

export default App