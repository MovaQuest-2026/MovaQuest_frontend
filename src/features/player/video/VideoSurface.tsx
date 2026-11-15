import { forwardRef } from 'react'
import type { VideoSource } from '../../../types/lesson'
import { FileVideo } from './FileVideo'
import { TikTokVideo } from './TikTokVideo'
import type { VideoHandle, VideoSurfaceProps } from './types'

interface Props extends VideoSurfaceProps {
  source: VideoSource
}

export const VideoSurface = forwardRef<VideoHandle, Props>(function VideoSurface({ source, ...props }, ref) {
  return source.type === 'tiktok' ? (
    <TikTokVideo ref={ref} videoId={source.videoId} {...props} />
  ) : (
    <FileVideo ref={ref} src={source.src} {...props} />
  )
})
