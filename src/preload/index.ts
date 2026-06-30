import { contextBridge, ipcRenderer } from 'electron'
import type {
  Property,
  Panel,
  Breaker,
  BreakerWithEntityCount,
  Entity,
  EntitiesByRoom,
  CreatePropertyInput,
  CreatePanelInput,
  CreateBreakerInput,
  CreateEntityInput,
  UpdatePropertyInput,
  UpdatePanelInput,
  UpdateBreakerInput,
  UpdateEntityInput,
  Tag,
  TagLink,
  CreateTagInput,
  UpdateTagInput,
  TargetType,
  TargetRef,
  HistoryEvent,
  HistoryEventWithDetails,
  RolledUpHistoryEvent,
  CreateHistoryEventInput,
  UpdateHistoryEventInput,
  EventType,
  CreateEventTypeInput,
  UpdateEventTypeInput,
  Task,
  TaskWithTarget,
  CreateTaskInput,
  UpdateTaskInput,
  TaskTemplate,
  CreateTaskTemplateInput
} from '../shared/types'

export interface ElectronAPI {
  properties: {
    create: (input: CreatePropertyInput) => Promise<Property>
    getCurrentOrNull: () => Promise<Property | null>
    findAll: () => Promise<Property[]>
    findById: (id: string) => Promise<Property | null>
    setAsCurrent: (id: string) => Promise<Property | null>
    update: (id: string, input: UpdatePropertyInput) => Promise<Property | null>
    delete: (id: string) => Promise<boolean>
    addCustomEntityType: (propertyId: string, newType: string) => Promise<Property | null>
    removeCustomEntityType: (propertyId: string, typeToRemove: string) => Promise<Property | null>
  }
  panels: {
    create: (input: CreatePanelInput) => Promise<Panel>
    getCurrentOrNull: () => Promise<Panel | null>
    findAll: () => Promise<Panel[]>
    findById: (id: string) => Promise<Panel | null>
    findByProperty: (propertyId: string) => Promise<Panel[]>
    update: (id: string, input: UpdatePanelInput) => Promise<Panel | null>
    delete: (id: string) => Promise<boolean>
    reset: (id: string) => Promise<{ entitiesDeleted: number; breakersDeleted: number }>
  }
  backup: {
    export: () => Promise<{ success: boolean; message: string }>
    import: () => Promise<{ success: boolean; message: string }>
  }
  seed: {
    loadSample: () => Promise<{ success: boolean; message: string }>
  }
  breakers: {
    create: (input: CreateBreakerInput) => Promise<Breaker>
    createBatch: (inputs: CreateBreakerInput[]) => Promise<Breaker[]>
    findById: (id: string) => Promise<Breaker | null>
    listByPanel: (panelId: string) => Promise<BreakerWithEntityCount[]>
    update: (id: string, input: UpdateBreakerInput) => Promise<Breaker | null>
    delete: (id: string) => Promise<boolean>
  }
  entities: {
    create: (input: CreateEntityInput) => Promise<Entity>
    createBatch: (inputs: CreateEntityInput[]) => Promise<Entity[]>
    findById: (id: string) => Promise<Entity | null>
    listByPanel: (panelId: string) => Promise<Entity[]>
    listByBreaker: (breakerId: string) => Promise<Entity[]>
    listUnmapped: (panelId: string) => Promise<Entity[]>
    groupByRoom: (panelId: string) => Promise<EntitiesByRoom[]>
    search: (panelId: string, query: string) => Promise<Entity[]>
    assignToBreaker: (entityIds: string[], breakerId: string) => Promise<void>
    unassignFromBreaker: (entityIds: string[]) => Promise<void>
    update: (id: string, input: UpdateEntityInput) => Promise<Entity | null>
    delete: (id: string) => Promise<boolean>
    getAllRooms: (panelId: string) => Promise<Array<{ room: string; count: number }>>
    deleteRoom: (panelId: string, roomName: string) => Promise<number>
    renameRoom: (panelId: string, oldName: string, newName: string) => Promise<number>
    getAllEntityTypes: (panelId: string) => Promise<Array<{ entity_type: string; count: number }>>
    changeEntityType: (panelId: string, oldType: string, newType: string) => Promise<number>
  }
  tags: {
    create: (input: CreateTagInput) => Promise<Tag>
    findById: (id: string) => Promise<Tag | null>
    listForProperty: (propertyId: string) => Promise<Tag[]>
    listForTarget: (targetType: TargetType, targetId: string) => Promise<Tag[]>
    update: (id: string, input: UpdateTagInput) => Promise<Tag | null>
    delete: (id: string) => Promise<boolean>
    attach: (tagId: string, targetType: TargetType, targetId: string) => Promise<void>
    detach: (tagId: string, targetType: TargetType, targetId: string) => Promise<void>
    listTargetsForTag: (tagId: string) => Promise<TagLink[]>
  }
  history: {
    createEvent: (input: CreateHistoryEventInput) => Promise<HistoryEventWithDetails>
    updateEvent: (id: string, input: UpdateHistoryEventInput) => Promise<HistoryEventWithDetails | null>
    deleteEvent: (id: string) => Promise<boolean>
    findById: (id: string) => Promise<HistoryEvent | null>
    addTargets: (eventId: string, targets: TargetRef[]) => Promise<void>
    removeTarget: (eventId: string, targetType: TargetType, targetId: string) => Promise<boolean>
    listForTarget: (targetType: TargetType, targetId: string) => Promise<HistoryEventWithDetails[]>
    listForProperty: (propertyId: string) => Promise<HistoryEventWithDetails[]>
    listForPanel: (panelId: string) => Promise<HistoryEventWithDetails[]>
    listForBreakerRollup: (breakerId: string) => Promise<RolledUpHistoryEvent[]>
    listEventTypes: (propertyId: string) => Promise<EventType[]>
    createEventType: (input: CreateEventTypeInput) => Promise<EventType>
    updateEventType: (id: string, input: UpdateEventTypeInput) => Promise<EventType | null>
    deleteEventType: (id: string) => Promise<boolean>
    countEventsForType: (eventTypeId: string) => Promise<number>
  }
  tasks: {
    create: (input: CreateTaskInput) => Promise<Task>
    update: (id: string, input: UpdateTaskInput) => Promise<Task | null>
    complete: (id: string) => Promise<Task | null>
    completeWithRules: (id: string, propertyId: string, opts?: { removeTagIds?: string[]; addTagIds?: string[]; logHistory?: boolean; historyNote?: string }) => Promise<Task | null>
    reopen: (id: string) => Promise<Task | null>
    delete: (id: string) => Promise<boolean>
    listForTarget: (targetType: TargetType, targetId: string) => Promise<Task[]>
    listForProperty: (propertyId: string) => Promise<TaskWithTarget[]>
    openCountForTarget: (targetType: TargetType, targetId: string) => Promise<number>
    listTemplates: (propertyId: string) => Promise<TaskTemplate[]>
    createTemplate: (input: CreateTaskTemplateInput) => Promise<TaskTemplate>
    deleteTemplate: (id: string) => Promise<boolean>
    createFromTemplate: (templateId: string, targets: { target_type: TargetType; target_id: string }[]) => Promise<string[]>
  }
}

const electronAPI: ElectronAPI = {
  properties: {
    create: (input) => ipcRenderer.invoke('properties:create', input),
    getCurrentOrNull: () => ipcRenderer.invoke('properties:getCurrentOrNull'),
    findAll: () => ipcRenderer.invoke('properties:findAll'),
    findById: (id) => ipcRenderer.invoke('properties:findById', id),
    setAsCurrent: (id) => ipcRenderer.invoke('properties:setAsCurrent', id),
    update: (id, input) => ipcRenderer.invoke('properties:update', id, input),
    delete: (id) => ipcRenderer.invoke('properties:delete', id),
    addCustomEntityType: (propertyId, newType) => ipcRenderer.invoke('properties:addCustomEntityType', propertyId, newType),
    removeCustomEntityType: (propertyId, typeToRemove) => ipcRenderer.invoke('properties:removeCustomEntityType', propertyId, typeToRemove)
  },
  panels: {
    create: (input) => ipcRenderer.invoke('panels:create', input),
    getCurrentOrNull: () => ipcRenderer.invoke('panels:getCurrentOrNull'),
    findAll: () => ipcRenderer.invoke('panels:findAll'),
    findById: (id) => ipcRenderer.invoke('panels:findById', id),
    findByProperty: (propertyId) => ipcRenderer.invoke('panels:findByProperty', propertyId),
    update: (id, input) => ipcRenderer.invoke('panels:update', id, input),
    delete: (id) => ipcRenderer.invoke('panels:delete', id),
    reset: (id) => ipcRenderer.invoke('panels:reset', id)
  },
  breakers: {
    create: (input) => ipcRenderer.invoke('breakers:create', input),
    createBatch: (inputs) => ipcRenderer.invoke('breakers:createBatch', inputs),
    findById: (id) => ipcRenderer.invoke('breakers:findById', id),
    listByPanel: (panelId) => ipcRenderer.invoke('breakers:listByPanel', panelId),
    update: (id, input) => ipcRenderer.invoke('breakers:update', id, input),
    delete: (id) => ipcRenderer.invoke('breakers:delete', id)
  },
  entities: {
    create: (input) => ipcRenderer.invoke('entities:create', input),
    createBatch: (inputs) => ipcRenderer.invoke('entities:createBatch', inputs),
    findById: (id) => ipcRenderer.invoke('entities:findById', id),
    listByPanel: (panelId) => ipcRenderer.invoke('entities:listByPanel', panelId),
    listByBreaker: (breakerId) => ipcRenderer.invoke('entities:listByBreaker', breakerId),
    listUnmapped: (panelId) => ipcRenderer.invoke('entities:listUnmapped', panelId),
    groupByRoom: (panelId) => ipcRenderer.invoke('entities:groupByRoom', panelId),
    search: (panelId, query) => ipcRenderer.invoke('entities:search', panelId, query),
    assignToBreaker: (entityIds, breakerId) =>
      ipcRenderer.invoke('entities:assignToBreaker', entityIds, breakerId),
    unassignFromBreaker: (entityIds) =>
      ipcRenderer.invoke('entities:unassignFromBreaker', entityIds),
    update: (id, input) => ipcRenderer.invoke('entities:update', id, input),
    delete: (id) => ipcRenderer.invoke('entities:delete', id),
    getAllRooms: (panelId) => ipcRenderer.invoke('entities:getAllRooms', panelId),
    deleteRoom: (panelId, roomName) => ipcRenderer.invoke('entities:deleteRoom', panelId, roomName),
    renameRoom: (panelId, oldName, newName) => ipcRenderer.invoke('entities:renameRoom', panelId, oldName, newName),
    getAllEntityTypes: (panelId) => ipcRenderer.invoke('entities:getAllEntityTypes', panelId),
    changeEntityType: (panelId, oldType, newType) => ipcRenderer.invoke('entities:changeEntityType', panelId, oldType, newType)
  },
  backup: {
    export: () => ipcRenderer.invoke('backup:export'),
    import: () => ipcRenderer.invoke('backup:import')
  },
  seed: {
    loadSample: () => ipcRenderer.invoke('seed:loadSample')
  },
  tags: {
    create: (input) => ipcRenderer.invoke('tags:create', input),
    findById: (id) => ipcRenderer.invoke('tags:findById', id),
    listForProperty: (propertyId) => ipcRenderer.invoke('tags:listForProperty', propertyId),
    listForTarget: (targetType, targetId) => ipcRenderer.invoke('tags:listForTarget', targetType, targetId),
    update: (id, input) => ipcRenderer.invoke('tags:update', id, input),
    delete: (id) => ipcRenderer.invoke('tags:delete', id),
    attach: (tagId, targetType, targetId) => ipcRenderer.invoke('tags:attach', tagId, targetType, targetId),
    detach: (tagId, targetType, targetId) => ipcRenderer.invoke('tags:detach', tagId, targetType, targetId),
    listTargetsForTag: (tagId) => ipcRenderer.invoke('tags:listTargetsForTag', tagId)
  },
  history: {
    createEvent: (input) => ipcRenderer.invoke('history:createEvent', input),
    updateEvent: (id, input) => ipcRenderer.invoke('history:updateEvent', id, input),
    deleteEvent: (id) => ipcRenderer.invoke('history:deleteEvent', id),
    findById: (id) => ipcRenderer.invoke('history:findById', id),
    addTargets: (eventId, targets) => ipcRenderer.invoke('history:addTargets', eventId, targets),
    removeTarget: (eventId, targetType, targetId) =>
      ipcRenderer.invoke('history:removeTarget', eventId, targetType, targetId),
    listForTarget: (targetType, targetId) => ipcRenderer.invoke('history:listForTarget', targetType, targetId),
    listForProperty: (propertyId) => ipcRenderer.invoke('history:listForProperty', propertyId),
    listForPanel: (panelId) => ipcRenderer.invoke('history:listForPanel', panelId),
    listForBreakerRollup: (breakerId) => ipcRenderer.invoke('history:listForBreakerRollup', breakerId),
    listEventTypes: (propertyId) => ipcRenderer.invoke('history:listEventTypes', propertyId),
    createEventType: (input) => ipcRenderer.invoke('history:createEventType', input),
    updateEventType: (id, input) => ipcRenderer.invoke('history:updateEventType', id, input),
    deleteEventType: (id) => ipcRenderer.invoke('history:deleteEventType', id),
    countEventsForType: (eventTypeId) => ipcRenderer.invoke('history:countEventsForType', eventTypeId)
  },
  tasks: {
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    update: (id, input) => ipcRenderer.invoke('tasks:update', id, input),
    complete: (id) => ipcRenderer.invoke('tasks:complete', id),
    completeWithRules: (id, propertyId, opts) => ipcRenderer.invoke('tasks:completeWithRules', id, propertyId, opts),
    reopen: (id) => ipcRenderer.invoke('tasks:reopen', id),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    listForTarget: (targetType, targetId) => ipcRenderer.invoke('tasks:listForTarget', targetType, targetId),
    listForProperty: (propertyId) => ipcRenderer.invoke('tasks:listForProperty', propertyId),
    openCountForTarget: (targetType, targetId) => ipcRenderer.invoke('tasks:openCountForTarget', targetType, targetId),
    listTemplates: (propertyId) => ipcRenderer.invoke('tasks:listTemplates', propertyId),
    createTemplate: (input) => ipcRenderer.invoke('tasks:createTemplate', input),
    deleteTemplate: (id) => ipcRenderer.invoke('tasks:deleteTemplate', id),
    createFromTemplate: (templateId, targets) => ipcRenderer.invoke('tasks:createFromTemplate', templateId, targets)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
