import {
  DetectDocumentTextCommand,
  TextractClient,
} from '@aws-sdk/client-textract'

import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'

const REGION = 'ap-south-1'

const IDENTITY_POOL_ID =
  'ap-south-1:2c938875-d141-4cb2-bafa-7b87af4a99a9'

const USER_POOL_PROVIDER =
  'cognito-idp.ap-south-1.amazonaws.com/ap-south-1_dTRMpysvm'

function createTextractClient(idToken: string) {
  return new TextractClient({
    region: REGION,

    credentials: fromCognitoIdentityPool({
      clientConfig: {
        region: REGION,
      },

      identityPoolId: IDENTITY_POOL_ID,

      logins: {
        [USER_POOL_PROVIDER]: idToken,
      },
    }),
  })
}

export async function extractTextWithTextract(
  file: File,
  idToken: string
): Promise<string> {
  if (!idToken) {
    throw new Error('User is not authenticated')
  }

  if (
    file.type !== 'image/jpeg' &&
    file.type !== 'image/png'
  ) {
    throw new Error(
      'Textract currently supports JPEG and PNG images in this flow.'
    )
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      'Invoice image must be smaller than 5 MB.'
    )
  }

  const client = createTextractClient(idToken)

  const bytes = new Uint8Array(
    await file.arrayBuffer()
  )

  const command =
    new DetectDocumentTextCommand({
      Document: {
        Bytes: bytes,
      },
    })

  const response = await client.send(command)

  const lines =
    response.Blocks
      ?.filter(
        (block) => block.BlockType === 'LINE'
      )
      .map((block) => block.Text)
      .filter(Boolean) ?? []

  return lines.join('\n')
}