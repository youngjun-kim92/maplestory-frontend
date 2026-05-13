import { charactersApi } from './characters'
import { bossApi } from './boss'
import type { MapleCharacter, DopingItem } from '../types'

// --- Auction ---
interface AuctionInitData {
  characters: MapleCharacter[]
  selectedCharId: string
}

let _auctionCache: { serverId: number | null; data: AuctionInitData } | null = null
let _auctionInFlight = false

export const auctionCache = {
  get: (serverId: number | null): AuctionInitData | null =>
    _auctionCache?.serverId === serverId ? _auctionCache.data : null,
  set: (serverId: number | null, data: AuctionInitData) => {
    _auctionCache = { serverId, data }
  },
}

export function prefetchAuction(serverId: number | null): void {
  if (_auctionCache?.serverId === serverId) return
  if (_auctionInFlight) return
  _auctionInFlight = true
  charactersApi.getCharacters()
    .then((r) => {
      const chars = r.data
      const main = chars.find((c) => c.isMain) ?? chars[0]
      _auctionCache = { serverId, data: { characters: chars, selectedCharId: main ? String(main.id) : 'all' } }
    })
    .catch(() => {})
    .finally(() => { _auctionInFlight = false })
}

// --- Shop ---
interface ShopInitData {
  characters: MapleCharacter[]
  selectedCharId: string
  dopingList: DopingItem[]
}

let _shopCache: ShopInitData | null = null
let _shopInFlight = false

export const shopCache = {
  get: (): ShopInitData | null => _shopCache,
  set: (data: ShopInitData) => { _shopCache = data },
}

export function prefetchShop(): void {
  if (_shopCache) return
  if (_shopInFlight) return
  _shopInFlight = true
  Promise.all([charactersApi.getCharacters(), bossApi.getDopingList()])
    .then(([chars, dopings]) => {
      const charList = chars.data
      const main = charList.find((c) => c.isMain) ?? charList[0]
      _shopCache = {
        characters: charList,
        selectedCharId: main ? String(main.id) : '',
        dopingList: dopings.data,
      }
    })
    .catch(() => {})
    .finally(() => { _shopInFlight = false })
}
