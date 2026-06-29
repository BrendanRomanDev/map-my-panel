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

  // ---- Tag-wired rules + templates ----

  function tag(name: string): string {
    const id = `tag-${name}`
    db.prepare("INSERT INTO tags (id, property_id, name, condense, created_at, updated_at) VALUES (?, 'prop_a', ?, 0, ?, ?)")
      .run(id, name, new Date().toISOString(), new Date().toISOString())
    return id
  }
  function tagsOn(entityId: string): string[] {
    return (db.prepare(
      "SELECT t.name FROM tag_links l JOIN tags t ON t.id=l.tag_id WHERE l.target_type='entity' AND l.target_id=?"
    ).all(entityId) as any[]).map(r => r.name)
  }

  it('on_create_tag_id attaches the tag to the entity', () => {
    const needs = tag('Needs Ground')
    repo.create({ entity_id: 'e1', title: 'ground it', on_create_tag_id: needs })
    expect(tagsOn('e1')).toContain('Needs Ground')
  })

  it('completeWithRules removes + adds tags and logs history', () => {
    const needs = tag('Needs Ground')
    const grounded = tag('Self-Grounded')
    const t = repo.create({
      entity_id: 'e1', title: 'self-ground',
      on_create_tag_id: needs,
      on_complete_remove_tag_ids: [needs],
      on_complete_add_tag_ids: [grounded],
      on_complete_log_history: true
    })
    expect(tagsOn('e1')).toContain('Needs Ground')

    repo.completeWithRules(t.id, 'prop_a')

    const after = tagsOn('e1')
    expect(after).not.toContain('Needs Ground')
    expect(after).toContain('Self-Grounded')
    expect(repo.findById(t.id)!.status).toBe('done')
    // a history event was logged on the entity
    const hist = db.prepare(
      "SELECT COUNT(*) c FROM event_links WHERE target_type='entity' AND target_id='e1'"
    ).get() as { c: number }
    expect(hist.c).toBe(1)
  })

  it('createFromTemplate makes one task per entity, substituting {entityName}', () => {
    const needs = tag('Needs Ground')
    const tpl = repo.createTemplate({
      property_id: 'prop_a', name: 'Self-ground', task_type: 'Self-Ground',
      title_template: 'Self-ground {entityName}',
      on_create_tag_id: needs, on_complete_add_tag_ids: [], on_complete_remove_tag_ids: [needs], on_complete_log_history: true
    })
    const ids = repo.createFromTemplate(tpl.id, ['e1', 'e2'])
    expect(ids).toHaveLength(2)
    const t1 = repo.findById(ids[0])!
    expect(t1.title).toMatch(/Self-ground (Outlet A|Outlet B)/)
    // on_create tag applied to both entities
    expect(tagsOn('e1')).toContain('Needs Ground')
    expect(tagsOn('e2')).toContain('Needs Ground')
  })
})
