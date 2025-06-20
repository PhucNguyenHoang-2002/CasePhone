import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { z } from 'zod'
import sharp from 'sharp'
import { db } from '@/db'

const f = createUploadthing()

export const ourFileRouter = {
  imageUploader: f({ image: { maxFileSize: '4MB' } })
    .input(z.object({ configId: z.string().optional() }))
    .middleware(async ({ input }) => {
      return { input }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const { configId } = metadata.input

      // Để file.ufsUrl có thể fetch được từ server, bạn cần đảm bảo file đó được lưu trữ ở nơi public (ví dụ: S3, Cloudinary, hoặc một static hosting nào đó) và trả về URL public.
      // Nếu bạn dùng uploadthing, hãy cấu hình storage provider (S3, v.v) để file upload xong sẽ có URL public.
      // Sau khi upload, file.ufsUrl sẽ là một đường dẫn public mà server có thể fetch được.
      // Nếu bạn dùng local storage, hãy cấu hình Next.js để public thư mục chứa file (ví dụ: /public/uploads) và file.ufsUrl phải là đường dẫn tuyệt đối (bao gồm domain).
      // Ví dụ với S3: file.ufsUrl = 'https://bucket.s3.amazonaws.com/filename.png'
      const res = await fetch(file.ufsUrl)
      const buffer = await res.arrayBuffer()

      const imgMetadata = await sharp(buffer).metadata()
      const { width, height } = imgMetadata

      if (!configId) {
        const configuration = await db.configuration.create({
          data: {
            imageUrl: file.ufsUrl,
            height: height || 500,
            width: width || 500,
          },
        })

        return { configId: configuration.id }
      } else {
        const updatedConfiguration = await db.configuration.update({
          where: {
            id: configId,
          },
          data: {
            croppedImageUrl: file.ufsUrl,
          },
        })

        return { configId: updatedConfiguration.id }
      }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter