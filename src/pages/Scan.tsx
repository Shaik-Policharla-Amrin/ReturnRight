import { useEffect, useRef, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { useNavigate } from 'react-router-dom'
import { FileText, ImagePlus, X } from 'lucide-react'
import TopBar from '../components/TopBar'
import { extractTextWithTextract, uploadInvoice } from '../aws'
import { extractTextFromImages } from '../ocr'
import { isReturnDocument, purchaseFromInvoice } from '../invoice'
import { usePurchases } from '../context/PurchaseContext'

export default function Scan() {
  const navigate = useNavigate()
  const auth = useAuth()
  const { addPurchases } = usePurchases()
  const fileRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')

  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  function onFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const added = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (!added.length) return
    const nextFiles = [...files, ...added].slice(0, 5)
    previews.forEach(URL.revokeObjectURL)
    setFiles(nextFiles)
    setPreviews(nextFiles.map((file) => URL.createObjectURL(file)))
    event.target.value = ''
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index])
    setFiles(files.filter((_, item) => item !== index))
    setPreviews(previews.filter((_, item) => item !== index))
  }

  async function scanInvoices() {
    if (!files.length || !auth.user?.id_token) { alert('Please sign in and select at least one invoice.'); return }
    try {
      setProcessing(true)
      setProgress(`Reading ${files.length} invoice${files.length === 1 ? '' : 's'} with Amazon Textract…`)

      // Upload and Textract start concurrently. The slower local OCR is only a fallback.
      const uploads = Promise.all(files.map((file) => uploadInvoice(file, auth.user!.id_token!)))
      const textract = Promise.all(files.map(async (file, index) => {
        const text = await extractTextWithTextract(file, auth.user!.id_token!)
        setProgress(`Textract read invoice ${index + 1} of ${files.length}…`)
        return text
      }))
      const [, extractedText] = await Promise.all([
        uploads,
        textract.catch(async (error) => {
          console.warn('Textract unavailable; using local OCR fallback.', error)
          setProgress('Using local OCR fallback…')
          return extractTextFromImages(files, (done, total) => setProgress(`Reading invoice ${done} of ${total}…`))
        }),
      ])

      setProgress('Preparing your purchases…')
      const returnDocuments = extractedText
        .map((text, index) => isReturnDocument(text) ? files[index].name : undefined)
        .filter((name): name is string => Boolean(name))

      if (returnDocuments.length) {
        setProcessing(false)
        alert(`${returnDocuments.join(', ')} looks like a return or credit-note document, not an original purchase invoice. Remove it and upload the original purchase invoice instead.`)
        return
      }

      const purchases = files.map((file, index) => purchaseFromInvoice(file, extractedText[index], index))
      addPurchases(purchases)
      previews.forEach(URL.revokeObjectURL)
      setFiles([]); setPreviews([])
      navigate(purchases.length === 1 ? `/purchase/${purchases[0].id}` : '/purchases')
    } catch (error) {
      console.error('Invoice processing failed:', error)
      setProcessing(false)
      alert(error instanceof Error ? error.message : 'Invoice processing failed. Please try again.')
    }
  }

  if (processing) return <div className="processing-page"><div className="spinner" /><strong>Getting your purchases ready</strong><span>{progress}</span><small>Your invoices are processed securely.</small></div>

  return <div className="scan-page"><TopBar title="Scan purchases" onBack={() => navigate('/dashboard')} dark /><main className="scan-content"><div className="scan-intro"><span>RETURNRIGHT SCAN</span><h1>Add up to 5 invoices at once.</h1><p>Choose an existing photo or file, or take a new photo from your phone.</p></div><div className={`invoice-dropzone ${files.length ? 'has-files' : ''}`}>{files.length ? <div className="invoice-grid">{files.map((file, index) => <div className="invoice-preview" key={`${file.name}-${index}`}><img src={previews[index]} alt={file.name} /><button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`}><X size={15} /></button><span>{file.name}</span></div>)}{files.length < 5 && <button type="button" className="add-more" onClick={() => fileRef.current?.click()}><ImagePlus size={22} />Add another</button>}</div> : <button type="button" className="empty-dropzone" onClick={() => fileRef.current?.click()}><FileText size={32} /><strong>Choose invoice photos</strong><span>Photos, Files, or Camera · up to 5 files</span></button>}</div><input ref={fileRef} type="file" accept="image/*" multiple onChange={onFileChosen} hidden />{files.length > 0 && <div className="scan-actions"><button type="button" className="secondary-action" onClick={() => fileRef.current?.click()}>Add more</button><button type="button" className="primary-action" onClick={scanInvoices}>Scan {files.length} invoice{files.length === 1 ? '' : 's'}</button></div>}</main></div>
}
