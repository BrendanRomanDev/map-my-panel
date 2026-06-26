import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../../src/main/db/migrations'
import { TaskRepository } from '../../src/main/db/repositories/TaskRepository'

function makeDb() {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  const propertyId = 'prop_a'
  db.prepare('INSERT INTO properties (id, name, custom_entity_types, is_current, created_at, updated_at) VALUES (?,?,?,?,?,?)')
    .run(propertyId, 'House', '[]', 1, Date.now(), Date.now())
  db.prepare('INSERT INTO panels (id, property_id, name, total_positions, main_breaker_amperage) VALUES (?,?,?,?,?)')
    .run('panel-1', propertyId, 'Main', 20, 200)
  db.prepare("INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room) VALUES ('e1','panel-1','[]','outlet','Outlet A','Kitchen')").run()
  db.prepare("INSERT INTO entities (id, panel_id, breaker_ids, entity_type, name, room) VALUES ('e2','panel-1','[]','outlet','Outlet B','Garage')").run()
  return db
}

describe('TaskRepository', () => {
  let db: Database.Database
  let repo: TaskRepository

  beforeEach(() => {
    db = makeDb()
    repo = new TaskRepository(db)
  })

  it('creates a task (open, no completed_at)', () => {
    const t = repo.create({ entity_id: 'e1', title: 'Self-ground this outlet', task_type: 'Self-Ground', notes: 'needs 20A box' })
    expect(t.status).toBe('open')
    expect(t.completed_at).toBeNull()
    expect(t.task_type).toBe('Self-Ground')
  })

  it('complete sets done + completed_at; reopen clears it', () => {
    const t = repo.create({ entity_id: 'e1', title: 'X' })
    const done = repo.complete(t.id)!
    expect(done.status).toBe('done')
    expect(done.completed_at).not.toBeNull()
    const open = repo.reopen(t.id)!
    expect(open.status).toBe('open')
    expect(open.completed_at).toBeNull()
  })

  it('listForPanel joins entity name/room across the panel', () => {
    repo.create({ entity_id: 'e1', title: 'A task' })
    repo.create({ entity_id: 'e2', title: 'B task' })
    const list = repo.listForPanel('panel-1')
    expect(list).toHaveLength(2)
    const a = list.find(t => t.title === 'A task')!
    expect(a.entity_name).toBe('Outlet A')
    expect(a.entity_room).toBe('Kitchen')
  })

  it('openCountForEntity counts only open tasks', () => {
    const t1 = repo.create({ entity_id: 'e1', title: '1' })
    repo.create({ entity_id: 'e1', title: '2' })
    expect(repo.openCountForEntity('e1')).toBe(2)
    repo.complete(t1.id)
    expect(repo.openCountForEntity('e1')).toBe(1)
  })

  it('tasks cascade-delete with their entity', () => {
    const t = repo.create({ entity_id: 'e1', title: 'doomed' })
    db.prepare('DELETE FROM entities WHERE id = ?').run('e1')
    expect(repo.findById(t.id)).toBeNull()
  })
})
