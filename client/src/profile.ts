import type { Profile } from './types'

const PROFILE_KEY = 'rag-learner-profile'

export const DEFAULT_PROFILE: Profile = {
  userName: 'You',
  assistantName: 'Luffy',
  userAvatar: '',
  assistantAvatar: '',
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      userName: parsed.userName?.trim() || DEFAULT_PROFILE.userName,
      assistantName: parsed.assistantName?.trim() || DEFAULT_PROFILE.assistantName,
      userAvatar: parsed.userAvatar ?? '',
      assistantAvatar: parsed.assistantAvatar ?? '',
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function readAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not read image'))
      image.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(String(reader.result))
          return
        }
        const scale = Math.max(size / image.width, size / image.height)
        const width = image.width * scale
        const height = image.height * scale
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
