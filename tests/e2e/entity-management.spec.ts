import { test, expect } from './helpers/electron'

test.describe('Entity Management', () => {
  test('should assign and unassign entities to breakers', async ({ window }) => {
    // Wait for the app to load
    await window.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 })

    // Navigate to a panel (assumes onboarding is complete or bypassed in test mode)
    // You may need to add test-specific navigation or data seeding

    // Find an unmapped entity
    const unmappedEntity = await window.locator('[data-testid="entity-card"]').first()
    await expect(unmappedEntity).toBeVisible()

    // Click on a breaker to open assignment modal
    const breaker = await window.locator('[data-testid="breaker-card"]').first()
    await breaker.click()

    // Assign button should be visible
    const assignButton = await window.locator('button:has-text("+ Assign")')
    await assignButton.click()

    // Assignment modal should open
    await expect(window.locator('text=Assign Entities to Breaker')).toBeVisible()

    // Select an entity
    const checkbox = await window.locator('input[type="checkbox"]').first()
    await checkbox.check()

    // Click assign button
    const modalAssignButton = await window.locator('button:has-text("Assign")')
    await modalAssignButton.click()

    // Modal should close
    await expect(window.locator('text=Assign Entities to Breaker')).not.toBeVisible()

    // Entity should now be assigned (removed from unmapped list)
    // Add specific assertion based on your UI
  })

  test('should edit entity properties', async ({ window }) => {
    await window.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 })

    // Find an entity card
    const entityCard = await window.locator('[data-testid="entity-card"]').first()
    await expect(entityCard).toBeVisible()

    // Click edit button
    const editButton = await entityCard.locator('[data-testid="entity-edit-btn"]')
    await editButton.click()

    // Edit modal should open
    await expect(window.locator('text=Edit Entity')).toBeVisible()

    // Change the name
    const nameInput = await window.locator('input[placeholder*="Kitchen"]')
    await nameInput.fill('Updated Entity Name')

    // Save changes
    const saveButton = await window.locator('button:has-text("Save Changes")')
    await saveButton.click()

    // Modal should close
    await expect(window.locator('text=Edit Entity')).not.toBeVisible()

    // Entity name should be updated
    await expect(window.locator('text=Updated Entity Name')).toBeVisible()
  })

  test('should delete entity with confirmation', async ({ window }) => {
    await window.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 })

    // Find an entity card
    const entityCard = await window.locator('[data-testid="entity-card"]').first()
    const entityName = await entityCard.locator('[data-testid="entity-name"]').textContent()

    // Click edit button
    const editButton = await entityCard.locator('[data-testid="entity-edit-btn"]')
    await editButton.click()

    // Click delete button
    const deleteButton = await window.locator('button:has-text("Delete")')
    await deleteButton.click()

    // Confirmation dialog should appear
    await expect(window.locator('text=Delete Entity?')).toBeVisible()

    // Cancel first
    const cancelButton = await window.locator('button:has-text("Cancel")').last()
    await cancelButton.click()

    // Dialog should close, entity still exists
    await expect(window.locator(`text=${entityName}`)).toBeVisible()

    // Try delete again
    await editButton.click()
    await deleteButton.click()

    // Confirm deletion
    const confirmDeleteButton = await window.locator('button:has-text("Delete")').last()
    await confirmDeleteButton.click()

    // Entity should be removed
    await expect(window.locator(`text=${entityName}`)).not.toBeVisible()
  })

  test('should remove entity from breaker', async ({ window }) => {
    await window.waitForSelector('[data-testid="app-loaded"]', { timeout: 10000 })

    // Open breaker detail panel with assigned entities
    const breakerWithEntities = await window.locator('[data-testid="breaker-card"][data-entity-count]').first()
    await breakerWithEntities.click()

    // Breaker detail panel should be visible
    await expect(window.locator('text=Assigned Entities')).toBeVisible()

    // Find entity in breaker
    const assignedEntity = await window.locator('[data-testid="assigned-entity"]').first()
    const entityName = await assignedEntity.textContent()

    // Click remove (X) button
    const removeButton = await assignedEntity.locator('[data-testid="remove-entity-btn"]')
    await removeButton.click()

    // Entity should be removed from breaker
    await expect(assignedEntity).not.toBeVisible()

    // Close breaker detail panel
    const closeButton = await window.locator('[data-testid="close-breaker-detail"]')
    await closeButton.click()

    // Entity should now appear in unmapped list
    await window.locator('text=Unmapped').click()
    await expect(window.locator(`text=${entityName}`)).toBeVisible()
  })
})
