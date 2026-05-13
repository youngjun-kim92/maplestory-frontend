import { CATEGORY_ICON_IMGS, CATEGORY_ICONS } from '../utils/format'

interface Props {
  category: string
  size?: number
}

export default function MapleIcon({ category, size = 16 }: Props) {
  const src = CATEGORY_ICON_IMGS[category]
  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      />
    )
  }
  return <>{CATEGORY_ICONS[category] ?? '💫'}</>
}
