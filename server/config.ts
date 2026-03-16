import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const DATA_DIR = join(process.cwd(), 'data')

export interface Account {
  name: string
  historyDir: string
}

function loadConfig(): { accounts: Account[]; ownerName: string } {
  const configPath = join(DATA_DIR, 'config.json')
  if (!existsSync(configPath)) {
    console.error('\n[msn-archive] No config found at data/config.json\nCopy data/config.example.json to data/config.json and fill in your details.\n')
    return { accounts: [], ownerName: '' }
  }
  const raw = JSON.parse(readFileSync(configPath, 'utf-8')) as { accounts: string[]; ownerName?: string }
  const accounts = raw.accounts.map(name => {
    const historyDir = ['History', 'history', 'HISTORY'].find(d => existsSync(join(DATA_DIR, name, d))) ?? 'History'
    return { name, historyDir }
  })
  return { accounts, ownerName: raw.ownerName ?? '' }
}

const _config = loadConfig()
export const ACCOUNTS   = _config.accounts
export const OWNER_NAME = _config.ownerName
