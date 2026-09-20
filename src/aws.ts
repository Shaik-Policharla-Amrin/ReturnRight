import {
  CognitoIdentityClient,
  GetIdCommand,
} from '@aws-sdk/client-cognito-identity'

import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract'

import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'

const REGION = 'ap-south-1'

const IDENTITY_POOL_ID =
  'ap-south-1:2c938875-d141-4cb2-bafa-7b87af4a99a9'

const USER_POOL_ID =
  'ap-south-1_dTRMpysvm'

const BUCKET_NAME =
  'returnright-invoices-amrin-2026'

const PROVIDER =
  `cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`

function credentialsFor(accessToken: string) {
  return fromCognitoIdentityPool({
    clientConfig: { region: REGION },
    identityPoolId: IDENTITY_POOL_ID,
    logins: { [PROVIDER]: accessToken },
  })
}

/** Fast AWS OCR for images. The authenticated Cognito role needs textract:DetectDocumentText. */
export async function extractTextWithTextract(file: File, accessToken: string) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const textract = new TextractClient({ region: REGION, credentials: credentialsFor(accessToken) })
  const result = await textract.send(new DetectDocumentTextCommand({ Document: { Bytes: bytes } }))
  return (result.Blocks ?? [])
    .filter((block) => block.BlockType === 'LINE' && block.Text)
    .map((block) => block.Text)
    .join('\n')
}

export async function uploadInvoice(
  file: File,
  accessToken: string
) {
  // Get this user's unique Cognito Identity ID
  const identityClient = new CognitoIdentityClient({
    region: REGION,
  })

  const identityResult = await identityClient.send(
    new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [PROVIDER]: accessToken,
      },
    })
  )

  if (!identityResult.IdentityId) {
    throw new Error('Could not get Cognito Identity ID')
  }

  const identityId = identityResult.IdentityId

  // Create temporary AWS credentials for this signed-in user
  const credentials = credentialsFor(accessToken)

  const s3 = new S3Client({
    region: REGION,
    credentials,
  })

  // Store the invoice inside this user's own folder
  const key = `${identityId}/${Date.now()}-${file.name}`
const fileData = new Uint8Array(await file.arrayBuffer())

await s3.send(
  new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileData,
    ContentType: file.type,
  })
)
  return {
    identityId,
    key,
  }
}
