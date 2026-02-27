'use client'

import { useParams } from 'next/navigation'
import LiveAuctionView from '@/components/live/LiveAuctionView'

export default function LiveAuctionPage() {
  const { auctionId } = useParams() as { auctionId: string }
  return <LiveAuctionView auctionId={auctionId} />
}
