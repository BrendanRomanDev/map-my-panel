import jsPDF from 'jspdf'
import type { Panel, Breaker, Entity } from '@shared/types'

export async function generatePanelPDF(
  panel: Panel,
  breakers: Breaker[],
  entities: Entity[]
): Promise<void> {
  const doc = new jsPDF()
  let y = 20 // Current Y position

  // Title
  doc.setFontSize(20)
  doc.text(panel.name, 105, y, { align: 'center' })
  y += 10

  // Panel Info
  doc.setFontSize(10)
  doc.text(`Total Positions: ${panel.total_positions}  |  Main Breaker: ${panel.main_breaker_amperage}A`, 105, y, { align: 'center' })
  y += 15

  // Breaker List Section
  doc.setFontSize(14)
  doc.text('Breaker Configuration', 20, y)
  y += 8

  // Sort breakers by position
  const sortedBreakers = [...breakers].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position
    if (!a.position_slot && !b.position_slot) return 0
    if (!a.position_slot) return -1
    if (!b.position_slot) return 1
    return a.position_slot.localeCompare(b.position_slot)
  })

  // Table headers
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Pos', 20, y)
  doc.text('Type', 35, y)
  doc.text('Amp', 60, y)
  doc.text('Label', 75, y)
  doc.text('Status', 110, y)
  doc.text('Power', 130, y)
  doc.text('Entities', 150, y)
  y += 5

  // Draw line
  doc.line(20, y, 190, y)
  y += 5

  // Breaker rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)

  for (const breaker of sortedBreakers) {
    const breakerEntities = entities.filter(e => e.breaker_ids.includes(breaker.id))
    const posText = `${breaker.position}${breaker.position_slot || ''}`
    const typeText = breaker.breaker_type === 'single-pole' ? 'SP' : 'DP'
    const statusText = breaker.status === 'active' ? 'Active' : 'Spare'
    const powerText = breaker.is_powered ? 'ON' : 'OFF'
    const entityNames = breakerEntities.map(e => e.name).join(', ')

    doc.text(posText, 20, y)
    doc.text(typeText, 35, y)
    doc.text(`${breaker.amperage}A`, 60, y)
    doc.text(breaker.label || '-', 75, y)
    doc.text(statusText, 110, y)
    doc.text(powerText, 130, y)

    // Handle long entity lists
    if (entityNames.length > 35) {
      doc.text(entityNames.substring(0, 32) + '...', 150, y)
    } else {
      doc.text(entityNames || '-', 150, y)
    }

    y += 5

    // Add new page if needed
    if (y > 270) {
      doc.addPage()
      y = 20
    }
  }

  y += 10

  // Entities by Room Section
  if (y > 200) {
    doc.addPage()
    y = 20
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Entities by Room', 20, y)
  y += 8

  // Group entities by room
  const entitiesByRoom = entities.reduce((acc, entity) => {
    const room = entity.room || 'Unmapped'
    if (!acc[room]) acc[room] = []
    acc[room].push(entity)
    return acc
  }, {} as Record<string, Entity[]>)

  const rooms = Object.keys(entitiesByRoom).sort()

  for (const room of rooms) {
    const roomEntities = entitiesByRoom[room]

    // Room header
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`${room} (${roomEntities.length})`, 20, y)
    y += 6

    // Entity list
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    for (const entity of roomEntities) {
      const entityBreakers = breakers.filter(b => entity.breaker_ids.includes(b.id))
      const breakerText = entityBreakers.length > 0
        ? entityBreakers.map(b => `Pos ${b.position}${b.position_slot || ''} (${b.amperage}A)`).join(', ')
        : 'Unmapped'

      doc.text(`• ${entity.name}`, 25, y)
      doc.text(`[${entity.entity_type}]`, 80, y)
      doc.text(breakerText, 110, y)

      if (entity.location) {
        doc.setTextColor(100, 100, 100)
        doc.text(entity.location, 150, y)
        doc.setTextColor(0, 0, 0)
      }

      y += 5

      // Add new page if needed
      if (y > 275) {
        doc.addPage()
        y = 20
      }
    }

    y += 3 // Space between rooms
  }

  // Footer on last page
  const pageCount = doc.internal.pages.length - 1
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(`Generated: ${new Date().toLocaleDateString()}  |  Page ${pageCount} of ${pageCount}`, 105, 285, { align: 'center' })

  // Save PDF
  doc.save(`${panel.name.replace(/[^a-z0-9]/gi, '_')}_panel_diagram.pdf`)
}
