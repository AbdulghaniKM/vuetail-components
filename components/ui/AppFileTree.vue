<template>
  <ul ref="tree" role="tree" :aria-label="label" class="flex flex-col text-control text-text" @keydown="onKeydown">
    <TreeLevel :nodes="items" :level="1" />
  </ul>
</template>

<script setup lang="ts">
/**
 * A file tree (WAI-ARIA APG Tree View). Nested `<ul role="group">` lists inside each open folder's
 * `treeitem`, one Tab stop (roving tabindex through useRovingFocus), and the APG keys:
 * Up / Down to the previous / next visible item, Right to open a folder or step into it, Left to
 * close it or step out to the parent, Home / End, type-ahead, `*` to open every sibling folder,
 * Enter to pick (and open or close a folder), Space to pick.
 */
import { computed, h, reactive, ref, useId, watch, type FunctionalComponent, type VNode } from 'vue';
import AppIcon from './AppIcon.vue';
import { useRovingFocus } from '@/composables/useRovingFocus';

export interface FileTreeNode {
  id: string;
  label: string;
  /** An icon class (`icon-[heroicons--*]`). Default: a folder (open or closed) or a document. */
  icon?: string;
  /**
   * Makes the node a folder. With `load`, a folder whose `children` is empty is loaded the first
   * time it opens.
   */
  children?: FileTreeNode[];
}

const props = withDefaults(
  defineProps<{
    items: FileTreeNode[];
    /** Names the tree. Required unless `aria-labelledby` points at a visible heading. */
    label?: string;
    /** Fetches a folder's children the first time it opens. Return them, or fill `children` yourself. */
    load?: (node: FileTreeNode) => Promise<FileTreeNode[] | void>;
    /** Shown in an open folder with nothing in it, and read as part of its name. */
    emptyLabel?: string;
  }>(),
  { emptyLabel: 'Empty' },
);

/** The picked node's id (v-model:selected). */
const selected = defineModel<string | null>('selected', { default: null });
/** Ids of the open folders (v-model:expanded). Works without a binding. */
const expanded = defineModel<string[]>('expanded', { default: () => [] });

const emit = defineEmits<{
  select: [node: FileTreeNode];
  toggle: [node: FileTreeNode, open: boolean];
  /** `load` rejected; the folder closes again and loads on its next open. */
  error: [node: FileTreeNode, error: unknown];
}>();

const id = useId();
// Node ids may hold spaces or slashes ("src/App.vue"), which an id reference list cannot carry.
const uids = new Map<string, number>();
const domId = (nodeId: string, part: string) => {
  if (!uids.has(nodeId)) uids.set(nodeId, uids.size);
  return `${id}-${uids.get(nodeId)}-${part}`;
};

const loaded = reactive(new Map<string, FileTreeNode[]>());
const loading = reactive(new Set<string>());

const isFolder = (node: FileTreeNode) => Array.isArray(node.children);
const isOpen = (node: FileTreeNode) => isFolder(node) && expanded.value.includes(node.id);
const childrenOf = (node: FileTreeNode) => (node.children?.length ? node.children : (loaded.get(node.id) ?? []));

interface Row {
  node: FileTreeNode;
  parent?: FileTreeNode;
}

// The visible items in the order they are drawn, which is the order of the treeitems in the DOM
// and so the order useRovingFocus walks: a closed folder's children are not rendered at all.
const visible = computed<Row[]>(() => {
  const out: Row[] = [];
  const walk = (nodes: FileTreeNode[], parent?: FileTreeNode) =>
    nodes.forEach((node) => {
      out.push({ node, parent });
      if (isOpen(node)) walk(childrenOf(node), node);
    });
  walk(props.items);
  return out;
});
const indexById = computed(() => new Map(visible.value.map((row, i) => [row.node.id, i])));

// Every known node's parent, open or not, so a hidden item can hand its Tab stop to an ancestor.
const parentOf = computed(() => {
  const map = new Map<string, string>();
  const walk = (nodes: FileTreeNode[], parent?: string) =>
    nodes.forEach((node) => {
      if (parent !== undefined) map.set(node.id, parent);
      if (isFolder(node)) walk(childrenOf(node), node.id);
    });
  walk(props.items);
  return map;
});

function findNode(nodeId: string, nodes: FileTreeNode[] = props.items): FileTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const found = isFolder(node) ? findNode(nodeId, childrenOf(node)) : undefined;
    if (found) return found;
  }
  return undefined;
}

const tree = ref<HTMLElement | null>(null);
const nav = useRovingFocus({
  count: () => visible.value.length,
  orientation: 'vertical',
  loop: false,
  container: tree,
  itemSelector: '[role="treeitem"]',
  label: (i) => visible.value[i]?.node.label ?? '',
});

// The Tab stop follows a node, not an index: items above it can open, close or load. It starts on
// the selected node, or on its nearest visible ancestor.
const activeId = ref<string | undefined>(selected.value ?? undefined);
watch(
  visible,
  (rows) => {
    if (!rows.length) return;
    let at = activeId.value;
    while (at !== undefined && !indexById.value.has(at)) at = parentOf.value.get(at);
    const i = at === undefined ? 0 : indexById.value.get(at)!;
    activeId.value = rows[i].node.id;
    if (nav.active.value !== i) nav.set(i, { focus: false });
  },
  { immediate: true },
);

function onItemFocus(nodeId: string) {
  const i = indexById.value.get(nodeId);
  if (i === undefined) return;
  activeId.value = nodeId;
  if (nav.active.value !== i) nav.set(i, { focus: false });
}

function focusNode(nodeId: string | undefined) {
  const i = nodeId === undefined ? undefined : indexById.value.get(nodeId);
  if (i !== undefined) nav.set(i);
}

// One write for several folders: with a v-model binding, `expanded` only catches up after the
// parent renders, so opening them one at a time would keep only the last.
function open(...nodes: FileTreeNode[]) {
  const opening = nodes.filter((node) => isFolder(node) && !isOpen(node));
  if (!opening.length) return;
  expanded.value = [...expanded.value, ...opening.map((node) => node.id)];
  opening.forEach((node) => {
    emit('toggle', node, true);
    loadChildren(node);
  });
}

async function loadChildren(node: FileTreeNode) {
  if (!props.load || node.children?.length || loaded.has(node.id) || loading.has(node.id)) return;
  loading.add(node.id);
  try {
    loaded.set(node.id, (await props.load(node)) ?? []);
  } catch (error) {
    expanded.value = expanded.value.filter((x) => x !== node.id);
    emit('error', node, error);
  } finally {
    loading.delete(node.id);
  }
}

function close(node: FileTreeNode) {
  if (!isOpen(node)) return;
  expanded.value = expanded.value.filter((x) => x !== node.id);
  emit('toggle', node, false);
}

function select(node: FileTreeNode) {
  if (selected.value !== node.id) selected.value = node.id;
  emit('select', node);
}

// Enter and a click pick the node; on a folder they also open or close it.
function activate(node: FileTreeNode) {
  select(node);
  if (isFolder(node)) {
    if (isOpen(node)) close(node);
    else open(node);
  }
}

function onKeydown(e: KeyboardEvent) {
  const row = visible.value[nav.active.value];
  if (!row || e.altKey || e.ctrlKey || e.metaKey) return;
  const { node, parent } = row;
  // APG: in right-to-left text, Right and Left swap.
  const rtl = !!tree.value && getComputedStyle(tree.value).direction === 'rtl';
  const key = rtl && e.key === 'ArrowLeft' ? 'ArrowRight' : rtl && e.key === 'ArrowRight' ? 'ArrowLeft' : e.key;

  switch (key) {
    case 'ArrowRight':
      e.preventDefault();
      if (!isFolder(node)) return;
      if (!isOpen(node)) open(node);
      else if (childrenOf(node).length) focusNode(childrenOf(node)[0].id);
      return;
    case 'ArrowLeft':
      e.preventDefault();
      if (isOpen(node)) close(node);
      else focusNode(parent?.id);
      return;
    case 'Enter':
      e.preventDefault();
      activate(node);
      return;
    case ' ':
      e.preventDefault();
      select(node);
      return;
    case '*':
      e.preventDefault();
      open(...(parent ? childrenOf(parent) : props.items));
      return;
  }
  nav.onKeydown(e);
}

// ── Rendering ──────────────────────────────────────────────────────────────────
// One template cannot call itself, so the levels are a small render function. Classes stay
// Tailwind strings in this file, where the scanner finds them.

const ROW =
  'vt-tree-row flex min-h-11 cursor-default select-none items-center gap-1.5 rounded-md pe-2 transition-colors duration-(--vt-duration) [[data-vt-preset=console]_&]:min-h-control-sm';
const CHEVRON =
  'shrink-0 text-text-muted transition-transform duration-(--vt-duration) ease-standard motion-reduce:transition-none rtl:-scale-x-100';

const indent = (level: number) => ({ paddingInlineStart: `${(level - 1) * 1.25 + 0.25}rem` });

function renderItem(node: FileTreeNode, level: number, pos: number, size: number): VNode {
  const folder = isFolder(node);
  const opened = isOpen(node);
  const busy = loading.has(node.id);
  const kids = opened ? childrenOf(node) : [];
  const empty = opened && !busy && kids.length === 0;
  const picked = selected.value === node.id;
  const index = indexById.value.get(node.id) ?? -1;
  const labelId = domId(node.id, 'label');
  const emptyId = domId(node.id, 'empty');
  const icon = node.icon ?? (folder ? (opened ? 'icon-[heroicons--folder-open]' : 'icon-[heroicons--folder]') : 'icon-[heroicons--document]');

  const marker = busy
    ? h(AppIcon, { name: 'icon-[heroicons--arrow-path]', size: 1, class: 'shrink-0 animate-spin text-text-muted motion-reduce:animate-pulse', 'aria-hidden': 'true' })
    : folder
      ? h(AppIcon, { name: 'icon-[heroicons--chevron-right]', size: 1, class: [CHEVRON, opened ? 'rotate-90 rtl:-rotate-90' : ''], 'aria-hidden': 'true' })
      : h('span', { class: 'size-4 shrink-0', 'aria-hidden': 'true' });

  return h(
    'li',
    {
      key: node.id,
      id: domId(node.id, 'item'),
      role: 'treeitem',
      class: 'vt-tree-item',
      tabindex: nav.tabindex(index),
      'aria-level': level,
      'aria-setsize': size,
      'aria-posinset': pos,
      'aria-expanded': folder ? opened : undefined,
      'aria-selected': picked,
      'aria-busy': busy ? 'true' : undefined,
      'aria-labelledby': empty ? `${labelId} ${emptyId}` : labelId,
      onFocus: () => onItemFocus(node.id),
      onClick: (e: MouseEvent) => {
        // A click on a child must not reach the folders around it.
        e.stopPropagation();
        activate(node);
      },
    },
    [
      h('div', { class: [ROW, picked ? 'bg-accent-subtle font-medium' : 'hover:bg-muted'], style: indent(level) }, [
        marker,
        h(AppIcon, { name: icon, size: 1.125, class: ['shrink-0', picked ? 'text-text' : 'text-text-muted'], 'aria-hidden': 'true' }),
        h('span', { id: labelId, class: 'min-w-0 flex-1 truncate' }, node.label),
      ]),
      empty ? h('div', { id: emptyId, class: 'py-1.5 text-sm text-text-muted', style: indent(level + 2) }, props.emptyLabel) : null,
      kids.length ? h('ul', { role: 'group', class: 'flex flex-col' }, kids.map((kid, k) => renderItem(kid, level + 1, k + 1, kids.length))) : null,
    ],
  );
}

const TreeLevel: FunctionalComponent<{ nodes: FileTreeNode[]; level: number }> = ({ nodes, level }) =>
  nodes.map((node, i) => renderItem(node, level, i + 1, nodes.length));
TreeLevel.props = ['nodes', 'level'];

defineExpose({
  /** Opens folders by id (loading them if needed). */
  open: (...ids: string[]) => open(...ids.map((x) => findNode(x)).filter((n): n is FileTreeNode => !!n)),
  /** Closes a folder by id. */
  close: (nodeId: string) => {
    const node = findNode(nodeId);
    if (node) close(node);
  },
  /** Moves focus to the tree's Tab stop. */
  focus: () => focusNode(activeId.value),
});
</script>

<style>
/* The treeitem holds its whole subtree, so a ring on it would circle every open child. The ring
   moves to the item's own row instead, inset so a scrolling parent cannot clip it. */
.vt-tree-item:focus-visible {
  outline: none;
}

.vt-tree-item:focus-visible > .vt-tree-row {
  outline: 2px solid var(--color-ring);
  outline-offset: -2px;
}
</style>
