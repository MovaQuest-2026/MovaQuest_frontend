import { useParams } from 'react-router-dom'

export function WorldScreen() {
  const { cityId } = useParams<{ cityId: string }>()

  return (
    <div className="screen world-screen">
      <p>World: {cityId}</p>
    </div>
  )
}
