import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  type ContainerClient,
} from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";
const proofContainer = process.env.AZURE_STORAGE_PROOF_CONTAINER ?? "teacher-proof-docs";
const photoContainer = process.env.AZURE_STORAGE_PHOTO_CONTAINER ?? "teacher-photos";
const sasExpiryMinutes = parseInt(process.env.AZURE_STORAGE_SAS_EXPIRY_MINUTES ?? "15", 10);

function getBlobServiceClient(): BlobServiceClient {
  return BlobServiceClient.fromConnectionString(connectionString);
}

function getContainerClient(containerName: string): ContainerClient {
  return getBlobServiceClient().getContainerClient(containerName);
}

/**
 * Generate a SAS URL for uploading a proof document.
 * The blob path is: {teacherProfileId}/{certificationId}/{filename}
 */
export async function generateProofUploadSasUrl(
  teacherProfileId: string,
  certificationId: string,
  filename: string,
): Promise<string> {
  const blobName = `${teacherProfileId}/${certificationId}/${filename}`;
  return generateSasUrl(proofContainer, blobName, "cw"); // create + write
}

/**
 * Generate a read-only SAS URL for viewing a proof document.
 */
export async function generateProofReadSasUrl(
  blobPath: string,
): Promise<string> {
  return generateSasUrl(proofContainer, blobPath, "r");
}

/**
 * Generate a SAS URL for uploading a teacher photo.
 */
export async function generatePhotoUploadSasUrl(
  teacherProfileId: string,
  filename: string,
): Promise<string> {
  const blobName = `${teacherProfileId}/${filename}`;
  return generateSasUrl(photoContainer, blobName, "cw");
}

/**
 * Get the public URL for a teacher photo.
 */
export function getPhotoPublicUrl(
  teacherProfileId: string,
  filename: string,
): string {
  const client = getContainerClient(photoContainer);
  return client.getBlobClient(`${teacherProfileId}/${filename}`).url;
}

/**
 * Delete a specific blob.
 */
export async function deleteBlob(
  containerName: string,
  blobPath: string,
): Promise<void> {
  const container = getContainerClient(containerName);
  const blob = container.getBlobClient(blobPath);
  await blob.deleteIfExists();
}

/**
 * Delete all blobs with a given prefix (e.g., all docs for a teacher).
 */
export async function deleteBlobsByPrefix(
  containerName: string,
  prefix: string,
): Promise<void> {
  const container = getContainerClient(containerName);
  for await (const blob of container.listBlobsFlat({ prefix })) {
    await container.getBlobClient(blob.name).deleteIfExists();
  }
}

async function generateSasUrl(
  containerName: string,
  blobName: string,
  permissions: string,
): Promise<string> {
  const client = getBlobServiceClient();
  // Parse credentials from connection string
  const accountName = connectionString.match(/AccountName=([^;]+)/)?.[1] ?? "";
  const accountKey = connectionString.match(/AccountKey=([^;]+)/)?.[1] ?? "";

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + sasExpiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse(permissions),
      startsOn,
      expiresOn,
    },
    sharedKeyCredential,
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}
