<template>
 <div ref="rootRef" class="flex w-full flex-col gap-1.5">
 <label v-if="label" :id="labelId" :for="inputId" class="text-control font-medium text-text">
 {{ label }}
 </label>

 <div class="relative">
 <!-- Trigger -->
 <button
 :id="inputId"
 ref="triggerRef"
 type="button"
 :disabled="readonly"
 :aria-expanded="isOpen"
 :aria-haspopup="'listbox'"
 :aria-invalid="!!error"
 :aria-describedby="error ? `${inputId}-error` : undefined"
 class="flex w-full items-center justify-between gap-2 h-control-md rounded-md border border-border-strong bg-surface px-3 text-start text-text transition-colors duration-(--vt-duration) ease-standard focus-visible:-outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
 :class="[customClass, { 'border-danger-text focus-visible:outline-danger-text': error }]"
 @click="toggle"
 @keydown="onTriggerKeydown"
 >
 <span class="flex min-w-0 items-center gap-2">
 <AppIcon
 v-if="selectedItem?.icon"
 :name="selectedItem.icon"
 :size="1.125"
 class="shrink-0 text-text-muted"
 aria-hidden="true"
 />
 <span :class="selectedLabel ? 'text-text' : 'text-text-muted'" class="truncate">
 {{ selectedLabel || placeholder || 'Select...' }}
 </span>
 </span>
 <AppIcon
 name="icon-[heroicons--chevron-down]"
 :size="1.125"
 class="shrink-0 text-text-muted transition-transform duration-(--vt-duration)"
 :class="isOpen ? 'rotate-180' : ''"
 />
 </button>

 <!-- Dropdown -->
 <Teleport to="body">
 <Transition
 enter-active-class="transition duration-(--vt-duration-enter) ease-standard"
 enter-from-class="scale-95 opacity-0 motion-reduce:scale-100"
 enter-to-class="scale-100 opacity-100"
 leave-active-class="transition duration-(--vt-duration-exit) ease-exit"
 leave-from-class="scale-100 opacity-100"
 leave-to-class="scale-95 opacity-0 motion-reduce:scale-100"
 >
 <div
 v-if="isOpen"
 ref="listContainerRef"
 class="fixed z-[9999] rounded-lg border border-border bg-surface-raised shadow-lg"
 :style="dropdownStyle"
 >
 <!-- Search -->
 <div v-if="searchable" class="border-b border-border p-2">
 <div class="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5">
 <AppIcon name="icon-[heroicons--magnifying-glass]" :size="0.875" class="shrink-0 text-text-muted" />
 <input
 ref="searchRef"
 v-model="searchQuery"
 type="text"
 role="combobox"
 aria-autocomplete="list"
 aria-expanded="true"
 :aria-controls="`${inputId}-listbox`"
 :aria-activedescendant="highlightedIndex >= 0 ? `${inputId}-opt-${highlightedIndex}` : undefined"
 aria-label="Search options"
 class="w-full bg-transparent text-sm text-text placeholder:text-text-subtle focus-visible:-outline-offset-2"
 placeholder="Search..."
 @keydown="onListKeydown"
 />
 </div>
 </div>

 <!-- Options list. Every section is an <li> holding its own <ul>, so an option's markup is
 written once: a named group (APG grouped listbox: role="group" labelled by its header) or,
 for items without a group, role="none", which leaves the options straight in the listbox. -->
 <ul
 ref="listRef"
 :id="`${inputId}-listbox`"
 role="listbox"
 tabindex="-1"
 :aria-labelledby="label ? labelId : undefined"
 :aria-activedescendant="highlightedIndex >= 0 ? `${inputId}-opt-${highlightedIndex}` : undefined"
 class="max-h-52 overflow-y-auto overscroll-contain p-1 scrollbar-thin"
 @keydown="onListKeydown"
 >
 <li
 v-if="filteredItems.length === 0"
 class="px-3 py-2.5 text-center text-sm text-text-muted"
 >
 No results found
 </li>
 <li
 v-for="(section, s) in sections"
 :key="section.group ?? ''"
 :role="section.group ? 'group' : 'none'"
 :aria-labelledby="section.group ? `${inputId}-group-${s}` : undefined"
 :class="s > 0 ? 'mt-1 border-t border-border pt-1' : ''"
 >
 <div
 v-if="section.group"
 :id="`${inputId}-group-${s}`"
 class="px-3 pb-1 pt-2 text-xs font-medium text-text-muted"
 >
 {{ section.group }}
 </div>
 <ul role="none">
 <li
 v-for="{ item, index } in section.rows"
 :id="`${inputId}-opt-${index}`"
 :key="item.value"
 role="option"
 :aria-selected="isSelected(item)"
 class="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors"
 :class="[
 isSelected(item)
 ? 'bg-accent/10 font-medium text-accent'
 : index === highlightedIndex
 ? 'bg-muted text-text'
 : 'text-text hover:bg-muted',
 ]"
 @click="selectItem(item)"
 @mouseenter="highlightedIndex = index"
 >
 <span class="flex min-w-0 items-center gap-2">
 <AppIcon
 v-if="item.icon"
 :name="item.icon"
 :size="1"
 class="shrink-0"
 :class="isSelected(item) ? '' : 'text-text-muted'"
 aria-hidden="true"
 />
 <span class="truncate">{{ item.label }}</span>
 </span>
 <AppIcon
 v-if="isSelected(item)"
 name="icon-[heroicons--check]"
 :size="1"
 class="shrink-0 text-accent"
 />
 </li>
 </ul>
 </li>
 </ul>
 </div>
 </Transition>
 </Teleport>
 </div>

 <span
 :id="`${inputId}-error`"
 class="block min-h-[1.25rem] text-sm text-danger-text"
 :class="{ invisible: !error }"
 role="alert"
 >
 {{ error }}
 </span>
 </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onBeforeUnmount, useId } from 'vue'
import AppIcon from '../AppIcon.vue'
import { useRovingFocus } from '@/composables/useRovingFocus'

export interface SelectItem {
 label: string
 value: string | number
 /** Items sharing a group are listed together under a header with this text. */
 group?: string
 /** An icon class (`icon-[heroicons--*]`) before the label, in the list and in the trigger. */
 icon?: string
}

interface Props {
 modelValue: string | number
 label?: string
 items: string[] | SelectItem[]
 placeholder?: string
 readonly?: boolean
 error?: string
 customClass?: string
 searchable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
 items: () => [],
 placeholder: '',
 readonly: false,
 searchable: true,
})

const emit = defineEmits<{
 'update:modelValue': [value: string | number]
}>()

const inputId = useId()
const labelId = `${inputId}-label`

const isOpen = ref(false)
const searchQuery = ref('')
const dropAbove = ref(false)
const dropdownStyle = ref<Record<string, string>>({})

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const listRef = ref<HTMLElement | null>(null)
const listContainerRef = ref<HTMLElement | null>(null)

const toRem = (px: number) => `${px / 16}rem`

function updatePosition() {
 if (!triggerRef.value) return
 const rect = triggerRef.value.getBoundingClientRect()
 const spaceBelow = window.innerHeight - rect.bottom
 const dropdownHeight = 240

 if (spaceBelow >= dropdownHeight || spaceBelow > rect.top) {
 dropAbove.value = false
 dropdownStyle.value = {
 top: toRem(rect.bottom + 4),
 left: toRem(rect.left),
 width: toRem(rect.width),
 transformOrigin: 'top',
 }
 } else {
 dropAbove.value = true
 dropdownStyle.value = {
 bottom: toRem(window.innerHeight - rect.top + 4),
 left: toRem(rect.left),
 width: toRem(rect.width),
 transformOrigin: 'bottom',
 }
 }
}

const normalizedItems = computed<SelectItem[]>(() => {
 if (!Array.isArray(props.items)) return []
 return props.items.map((item) =>
 typeof item === 'string' ? { label: item, value: item } : item
 )
})

// Drawn order: items without a group first, then each group where it first appears, so a
// group's items sit together even when they are scattered in `items`. The arrows, type-ahead
// and the option ids all follow this order.
const orderedItems = computed<SelectItem[]>(() => {
 const byGroup = new Map<string, SelectItem[]>([['', []]])
 for (const item of normalizedItems.value) {
 const key = item.group ?? ''
 if (!byGroup.has(key)) byGroup.set(key, [])
 byGroup.get(key)!.push(item)
 }
 return [...byGroup.values()].flat()
})

const filteredItems = computed(() => {
 const q = searchQuery.value.trim().toLowerCase()
 if (!q) return orderedItems.value
 return orderedItems.value.filter((item) =>
 item.label.toLowerCase().includes(q)
 )
})

// The filtered items cut into runs of one group. A group with no match has no run, so its
// header goes with it; `index` is the item's place in `filteredItems`.
const sections = computed(() => {
 const out: { group?: string; rows: { item: SelectItem; index: number }[] }[] = []
 filteredItems.value.forEach((item, index) => {
 const last = out[out.length - 1]
 if (last && (last.group ?? '') === (item.group ?? '')) last.rows.push({ item, index })
 else out.push({ group: item.group || undefined, rows: [{ item, index }] })
 })
 return out
})

// Active-descendant navigation: focus stays on the list (or the search box) while the arrows,
// Home, End and, without a search box, type-ahead move the highlight.
const nav = useRovingFocus({
 count: () => filteredItems.value.length,
 initial: -1,
 label: props.searchable ? undefined : (i) => filteredItems.value[i]?.label ?? '',
})
const highlightedIndex = nav.active

const selectedItem = computed(() => {
 if (props.modelValue === '' || props.modelValue == null) return undefined
 return normalizedItems.value.find((i) => String(i.value) === String(props.modelValue))
})
const selectedLabel = computed(() => selectedItem.value?.label ?? '')

function isSelected(item: SelectItem) {
 return String(item.value) === String(props.modelValue)
}

function toggle() {
 if (props.readonly) return
 isOpen.value ? close() : open()
}

function open() {
 isOpen.value = true
 searchQuery.value = ''
 highlightedIndex.value = -1
 nextTick(() => {
 updatePosition()
 if (props.searchable && searchRef.value) {
 searchRef.value.focus()
 } else {
 listRef.value?.focus()
 }
 })
}

function close() {
 isOpen.value = false
 searchQuery.value = ''
 highlightedIndex.value = -1
 triggerRef.value?.focus()
}

function selectItem(item: SelectItem) {
 const original = normalizedItems.value.find((i) => String(i.value) === String(item.value))
 if (original) {
 emit('update:modelValue', original.value)
 }
 close()
}

function onTriggerKeydown(e: KeyboardEvent) {
 if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
 e.preventDefault()
 if (!isOpen.value) open()
 }
}

function onListKeydown(e: KeyboardEvent) {
 const items = filteredItems.value
 if (!items.length) return

 switch (e.key) {
 case 'Enter':
 e.preventDefault()
 if (highlightedIndex.value >= 0 && highlightedIndex.value < items.length) {
 selectItem(items[highlightedIndex.value])
 }
 break
 case 'Escape':
 // Marked handled, so a dialog around the select stays open while the list closes.
 e.preventDefault()
 close()
 break
 default:
 // In the search box Home and End move the caret, as in any text field.
 if (props.searchable && (e.key === 'Home' || e.key === 'End')) return
 if (nav.onKeydown(e)) scrollToHighlighted()
 }
}

function scrollToHighlighted() {
 nextTick(() => {
 const el = listRef.value?.querySelector(`#${inputId}-opt-${highlightedIndex.value}`) as HTMLElement | null
 el?.scrollIntoView({ block: 'nearest' })
 })
}

// Reset highlight when search changes
watch(searchQuery, () => {
 highlightedIndex.value = filteredItems.value.length > 0 ? 0 : -1
})

// Click outside
function onClickOutside(e: MouseEvent) {
 if (!isOpen.value) return
 if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
 close()
 }
}

function onEscape(e: KeyboardEvent) {
 if (e.key === 'Escape' && isOpen.value) close()
}

function onReposition() {
 if (isOpen.value) updatePosition()
}

onMounted(() => {
 document.addEventListener('mousedown', onClickOutside)
 document.addEventListener('keydown', onEscape)
 window.addEventListener('scroll', onReposition, true)
 window.addEventListener('resize', onReposition)
})

onBeforeUnmount(() => {
 document.removeEventListener('mousedown', onClickOutside)
 document.removeEventListener('keydown', onEscape)
 window.removeEventListener('scroll', onReposition, true)
 window.removeEventListener('resize', onReposition)
})
</script>
