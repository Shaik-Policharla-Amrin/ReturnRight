import { createWorker } from 'tesseract.js'

let worker: Awaited<ReturnType<typeof createWorker>> | null = null

async function getWorker() {
  if (!worker) {
    worker = await createWorker('eng')
  }

  return worker
}

async function preprocessImage(file: File): Promise<Blob> {
  const image = new Image()

  const objectUrl = URL.createObjectURL(file)

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () =>
        reject(new Error('Could not load invoice image'))

      image.src = objectUrl
    })

    /*
     * Enlarge the image.
     * This helps Tesseract recognize small invoice text.
     */
    const scale = 2

    const canvas = document.createElement('canvas')

    canvas.width = image.width * scale
    canvas.height = image.height * scale

    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Could not create image canvas')
    }

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    )

    /*
     * Convert to grayscale and increase contrast.
     */
    const imageData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    )

    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // Grayscale
      let gray =
        0.299 * r +
        0.587 * g +
        0.114 * b

      // Increase contrast
      gray =
        ((gray - 128) * 1.35) + 128

      gray = Math.max(
        0,
        Math.min(255, gray)
      )

      data[i] = gray
      data[i + 1] = gray
      data[i + 2] = gray
    }

    ctx.putImageData(imageData, 0, 0)

    return await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(
                new Error(
                  'Could not process invoice image'
                )
              )
            }
          },
          'image/png',
          1
        )
      }
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export async function extractTextFromImage(
  file: File
) {
  const ocrWorker = await getWorker()

  console.log(
    'Preprocessing invoice:',
    file.name
  )

  const processedImage =
    await preprocessImage(file)

  console.log(
    'Running OCR:',
    file.name
  )

  const { data } =
    await ocrWorker.recognize(
      processedImage
    )

  console.log(
    'OCR completed:',
    file.name
  )

  console.log(
    'OCR text:',
    data.text
  )

  return data.text
}

export async function extractTextFromImages(
  files: File[],
  onProgress?: (
    completed: number,
    total: number
  ) => void
) {
  const results: string[] = []

  for (let i = 0; i < files.length; i++) {
    const text =
      await extractTextFromImage(files[i])

    results.push(text)

    onProgress?.(
      i + 1,
      files.length
    )
  }

  return results
}