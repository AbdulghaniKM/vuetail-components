<template>
  <div class="w-full">
    <!-- Toolbar -->
    <div
      v-if="searchable || (filters.length && filtersInToolbar) || $slots['toolbar-end']"
      class="mb-3 flex w-full min-w-0 flex-wrap items-center gap-2"
    >
      <div v-if="searchable" class="relative min-w-0 flex-1 sm:max-w-sm">
        <AppIcon
          name="icon-[heroicons-outline--magnifying-glass]"
          :size="1.125"
          class="text-text-muted pointer-events-none absolute start-3 top-1/2 -translate-y-1/2"
        />
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="border-border bg-surface text-text placeholder:text-text-muted/60 w-full rounded-xl border py-2 pe-9 ps-9 text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="text-text-muted hover:text-text absolute end-2.5 top-1/2 -translate-y-1/2 transition-colors"
          aria-label="Clear search"
          @click="searchQuery = ''; searchInputRef?.focus();"
        >
          <AppIcon name="icon-[heroicons-outline--x-mark]" :size="1" />
        </button>
      </div>

      <!-- filter-bar slot (override) or built-in AppTableFilters -->
      <slot name="filter-bar">
        <AppTableFilters
          v-if="filters.length && filtersInToolbar"
          v-model="activeFilters"
          :filters="filters"
        />
      </slot>

      <div class="flex items-center gap-2">
        <slot name="toolbar-end" />
      </div>
    </div>

    <!-- filter-bar when toolbar is not shown -->
    <div
      v-else-if="filters.length && !filtersInToolbar"
      class="mb-3"
    >
      <slot name="filter-bar">
        <AppTableFilters v-model="activeFilters" :filters="filters" />
      </slot>
    </div>

    <!-- Bulk action bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="selectable && selectedSet.size > 0"
        class="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-2"
      >
        <slot
          name="bulk-actions"
          :selected-keys="[...selectedSet]"
          :selected-rows="selectedRows"
          :clear="clearSelection"
        >
          <AppPopover
            v-if="selectionMode === 'all'"
            placement="bottom-start"
            :close-on-content-click="false"
            panel-class="border border-border bg-surface rounded-xl shadow-lg w-64 p-2"
          >
            <template #trigger="{ toggle }">
              <button
                type="button"
                class="flex items-center gap-1 rounded-md text-accent text-sm font-medium tabular-nums hover:underline"
                @click="toggle"
              >
                {{ selectedSet.size }} selected
                <AppIcon name="icon-[heroicons--chevron-down]" :size="0.75" />
              </button>
            </template>
            <template #default>
              <p class="px-2 pb-1.5 pt-1 text-xs font-semibold text-text-muted">
                {{ selectedOnPageCount }} on this page &middot; {{ selectedSet.size }} total
              </p>
              <div class="max-h-60 overflow-y-auto">
                <div
                  v-for="key in [...selectedSet]"
                  :key="key"
                  class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span class="truncate">{{ selectedRowLabel(key) }}</span>
                  <button
                    type="button"
                    class="text-text-muted hover:text-text shrink-0"
                    aria-label="Remove from selection"
                    @click="removeFromSelection(key)"
                  >
                    <AppIcon name="icon-[heroicons-outline--x-mark]" :size="0.875" />
                  </button>
                </div>
              </div>
            </template>
          </AppPopover>
          <span v-else class="text-accent text-sm font-medium tabular-nums">
            {{ selectedSet.size }} selected
          </span>
          <div class="flex flex-1 flex-wrap items-center gap-1.5">
            <AppButton
              v-for="action in bulkActions"
              :key="action.key ?? action.label"
              :label="action.label"
              :icon="action.icon"
              :variant="action.danger ? 'danger' : (action.variant ?? 'ghost')"
              :disabled="action.disabled?.([...selectedRows])"
              size="sm"
              @click="handleBulkAction(action)"
            />
          </div>
          <AppButton
            variant="ghost"
            label="Clear"
            icon="icon-[heroicons-outline--x-mark]"
            size="sm"
            @click="clearSelection"
          />
        </slot>
      </div>
    </Transition>

    <!-- Table -->
    <div
      class="overflow-hidden rounded-xl transition-all duration-300"
      :class="
        outlined
          ? 'border-border/60 border bg-surface/80 backdrop-blur-xl shadow-sm hover:shadow-md'
          : ''
      "
    >
      <div
        ref="tableScrollRef"
        class="overflow-x-auto"
        :class="{ 'is-scrolled-from-start': !scrollAtStart, 'is-not-scrolled-to-end': !scrollAtEnd }"
        style="-webkit-overflow-scrolling: touch"
        @scroll="updateScrollEdges"
      >
        <table class="w-full min-w-[48rem] border-collapse" style="table-layout: auto">
          <thead>
            <tr class="bg-muted/60">
              <th
                v-for="column in effectiveColumns"
                :key="column.key"
                class="px-4 py-3 text-start text-xs font-semibold uppercase tracking-tight whitespace-nowrap"
                :class="[
                  column.class,
                  column.key === '__select__'
                    ? 'sticky-select-th w-[3rem]'
                    : column.key === 'actions'
                      ? 'sticky-actions-th w-px'
                      : 'text-text-muted',
                ]"
                :aria-sort="
                  column.key !== '__select__' && column.key !== 'actions'
                    ? getAriaSort(column)
                    : undefined
                "
              >
                <template v-if="column.key === '__select__'">
                  <AppCheckbox
                    :model-value="isAllSelected"
                    :indeterminate="isPartialSelected"
                    @update:model-value="toggleAll"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <span class="text-text-muted">{{ actionsLabel }}</span>
                </template>
                <template v-else>
                  <button
                    v-if="isColumnSortable(column)"
                    type="button"
                    class="group flex items-center gap-1 transition-all duration-300 ease-out"
                    :class="
                      sortKey === column.key
                        ? 'text-accent'
                        : 'hover:text-text hover:scale-[1.02]'
                    "
                    @click="handleSort(column.key)"
                  >
                    <span>{{ column.label }}</span>
                    <span
                      class="flex size-5 items-center justify-center rounded transition-all duration-300 ease-out"
                      :class="
                        sortKey === column.key
                          ? 'bg-accent/10 opacity-100 scale-100'
                          : 'opacity-0 scale-95 group-hover:opacity-50 group-hover:scale-100'
                      "
                    >
                      <AppIcon
                        :name="
                          sortKey === column.key && sortOrder === 'desc'
                            ? 'icon-[heroicons-outline--bars-arrow-down]'
                            : 'icon-[heroicons-outline--bars-arrow-up]'
                        "
                        :size="0.875"
                      />
                    </span>
                  </button>
                  <span v-else class="text-text-muted">{{ column.label }}</span>
                </template>
              </th>
            </tr>
          </thead>

          <tbody :aria-busy="loading || undefined">
            <template v-if="loading">
              <tr>
                <td :colspan="effectiveColumns.length" class="px-4 pb-1 pt-3 text-center text-xs text-text-muted" role="status" aria-live="polite">
                  {{ loadingMessage }}
                </td>
              </tr>
              <tr
                v-for="i in skeletonRows"
                :key="`skeleton-${i}`"
                class="border-border/40 border-b"
              >
                <td
                  v-for="column in effectiveColumns"
                  :key="column.key"
                  class="px-4 py-3.5"
                >
                  <div
                    v-if="column.key !== '__select__'"
                    class="bg-muted h-4 animate-pulse rounded-md"
                    :class="column.key === 'actions' ? 'w-16' : 'w-full max-w-[10rem]'"
                  />
                </td>
              </tr>
            </template>

            <tr v-else-if="displayData.length === 0">
              <td :colspan="effectiveColumns.length" class="py-16 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="bg-muted flex size-14 items-center justify-center rounded-xl">
                    <AppIcon
                      name="icon-[heroicons-outline--inbox-stack]"
                      :size="1.75"
                      class="text-text-muted/50"
                    />
                  </div>
                  <div>
                    <p class="text-text mb-0.5 text-sm font-medium">{{ emptyMessage }}</p>
                    <p v-if="searchQuery || hasActiveFilters" class="text-text-muted text-xs">
                      Try adjusting your search or filters
                    </p>
                  </div>
                  <div v-if="searchQuery || hasActiveFilters" class="flex items-center gap-2">
                    <AppButton
                      v-if="searchQuery"
                      variant="ghost"
                      label="Clear search"
                      icon="icon-[heroicons-outline--x-mark]"
                      size="sm"
                      @click="searchQuery = ''"
                    />
                    <AppButton
                      v-if="hasActiveFilters"
                      variant="ghost"
                      label="Clear filters"
                      icon="icon-[heroicons-outline--funnel]"
                      size="sm"
                      @click="activeFilters = {}"
                    />
                  </div>
                </div>
              </td>
            </tr>

            <tr
              v-for="(row, index) in displayData"
              v-else
              :key="getRowKey(row, index)"
              class="table-row-data border-border/40 border-b transition-all duration-300 ease-out last:border-b-0 hover:bg-accent/[0.04] hover:shadow-[inset_2px_0_0_0_var(--color-accent)]"
              :class="selectable && isRowSelected(row, index) ? 'bg-accent/[0.03]' : ''"
            >
              <td
                v-for="column in effectiveColumns"
                :key="column.key"
                class="text-text min-w-0 whitespace-nowrap px-4 py-3 text-sm"
                :class="[
                  column.class,
                  column.key === '__select__' ? 'sticky-select-td w-[3rem]' : '',
                  column.key === 'actions' ? 'sticky-actions-td w-px' : '',
                ]"
              >
                <!-- selection column -->
                <template v-if="column.key === '__select__'">
                  <AppCheckbox
                    :model-value="isRowSelected(row, index)"
                    @update:model-value="toggleRow(row, index)"
                    @click.stop
                  />
                </template>

                <!-- actions column -->
                <template v-else-if="column.key === 'actions'">
                  <slot name="cell-actions" :row="row">
                    <div v-if="visibleRowActions(row).length" class="flex items-center gap-1">
                      <AppButton
                        v-for="action in inlineRowActions(row)"
                        :key="action.key ?? action.label"
                        :icon="action.icon"
                        :label="action.icon ? undefined : action.label"
                        :tooltip="action.icon ? action.label : undefined"
                        :icon-only="!!action.icon"
                        :variant="action.danger ? 'danger' : (action.variant ?? 'ghost')"
                        :disabled="action.disabled?.(row) || isActionPending(action, row, index)"
                        :loading="isActionPending(action, row, index)"
                        size="sm"
                        @click.stop="handleRowAction(action, row, index)"
                      />
                      <AppPopover
                        v-if="overflowRowActions(row).length"
                        placement="bottom-end"
                        :close-on-content-click="false"
                        panel-class="border border-border bg-surface rounded-xl shadow-lg py-1 min-w-[10rem]"
                      >
                        <template #trigger="{ toggle }">
                          <AppButton
                            icon="icon-[heroicons-outline--ellipsis-vertical]"
                            icon-only
                            variant="ghost"
                            size="sm"
                            tooltip="More actions"
                            @click.stop="toggle"
                          />
                        </template>
                        <template #default="{ close }">
                          <div role="menu">
                            <button
                              v-for="action in overflowRowActions(row)"
                              :key="action.key ?? action.label"
                              type="button"
                              role="menuitem"
                              class="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors"
                              :class="
                                action.danger
                                  ? 'text-error hover:bg-error/10'
                                  : 'text-text hover:bg-muted'
                              "
                              :disabled="action.disabled?.(row) || isActionPending(action, row, index)"
                              @click="handleRowAction(action, row, index); close();"
                            >
                              <AppIcon
                                v-if="action.icon"
                                :name="action.icon"
                                :size="1"
                                class="shrink-0"
                              />
                              {{ action.label }}
                            </button>
                          </div>
                        </template>
                      </AppPopover>
                    </div>
                  </slot>
                </template>

                <!-- regular cell -->
                <template v-else>
                  <slot
                    :name="`cell-${column.key}`"
                    :row="row"
                    :value="getValue(row, column.key)"
                    :column="column"
                  >
                    <!-- declarative inline status editing -->
                    <AppPopover
                      v-if="column.editable"
                      placement="bottom-start"
                      :close-on-content-click="false"
                      panel-class="border border-border bg-surface rounded-xl shadow-lg w-52 p-3"
                    >
                      <template #trigger="{ toggle }">
                        <button
                          type="button"
                          class="rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          :class="
                            isCellEditPending(column, row, index)
                              ? 'cursor-wait opacity-60'
                              : column.editable.disabled?.(row)
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer hover:ring-2 hover:ring-accent/30'
                          "
                          :disabled="isCellEditPending(column, row, index) || column.editable.disabled?.(row)"
                          @click.stop="toggle"
                        >
                          <AppSpinner v-if="isCellEditPending(column, row, index)" size="xs" />
                          <AppBadge
                            v-else
                            :variant="editableVariant(column, row)"
                            :label="editableLabel(column, row)"
                          />
                        </button>
                      </template>
                      <template #default="{ close }">
                        <div v-if="column.editable.type === 'boolean'">
                          <p class="mb-3 text-sm text-text">
                            Change status to <strong>{{ editableBooleanTargetLabel(column, row) }}</strong>?
                          </p>
                          <div class="flex gap-2">
                            <AppButton variant="ghost" label="No" size="sm" class="flex-1" @click="close" />
                            <AppButton
                              variant="accent"
                              label="Yes"
                              size="sm"
                              class="flex-1"
                              @click="handleCellEdit(column, row, index, !getValue(row, column.key), close)"
                            />
                          </div>
                        </div>
                        <div v-else role="menu">
                          <p class="mb-1.5 px-1 text-xs font-semibold uppercase tracking-tight text-text-muted">
                            Change Status
                          </p>
                          <button
                            v-for="opt in column.editable.options"
                            :key="String(opt.value)"
                            type="button"
                            role="menuitem"
                            class="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
                            :class="
                              String(getValue(row, column.key)) === String(opt.value)
                                ? 'bg-accent/10 font-medium text-accent'
                                : 'text-text hover:bg-muted'
                            "
                            @click="handleCellEdit(column, row, index, opt.value, close)"
                          >
                            <span>{{ opt.label }}</span>
                            <AppIcon
                              v-if="String(getValue(row, column.key)) === String(opt.value)"
                              name="icon-[heroicons-outline--check]"
                              :size="0.875"
                            />
                          </button>
                        </div>
                      </template>
                    </AppPopover>
                    <AppTooltip
                      v-else-if="column.truncate && getValue(row, column.key)"
                      :content="String(getValue(row, column.key))"
                      placement="top"
                      :dark="false"
                    >
                      <button
                        type="button"
                        class="text-text-muted block max-w-[14rem] truncate border-0 bg-transparent p-0 text-start text-sm cursor-pointer hover:text-text transition-colors"
                        @click="openTruncateModal(column.label, String(getValue(row, column.key)))"
                      >
                        {{ display(getValue(row, column.key)) }}
                      </button>
                    </AppTooltip>
                    <template v-else>
                      {{ display(getValue(row, column.key)) }}
                    </template>
                  </slot>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div
      v-if="showPagination || showColumnToggle"
      class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="showPagination" class="text-text-muted text-sm tabular-nums">
          {{ paginationStart }}&ndash;{{ paginationEnd }} {{ ofLabel }} {{ paginationTotal }}
        </span>

        <div v-if="serverPaginated && pageSizeOptions.length > 0" ref="pageSizeRef" class="relative">
          <button
            type="button"
            class="border-border bg-surface text-text hover:bg-muted hover:shadow-sm flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-300 ease-out active:scale-95"
            @click="showPageSizeMenu = !showPageSizeMenu"
          >
            {{ pageSize }} / page
            <AppIcon name="icon-[heroicons--chevron-up-down]" :size="0.75" class="text-text-muted" />
          </button>
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="showPageSizeMenu"
              class="border-border bg-surface absolute bottom-full end-0 z-50 mb-1.5 min-w-[5rem] origin-bottom rounded-xl border p-1 shadow-lg"
            >
              <button
                v-for="n in pageSizeOptions"
                :key="n"
                type="button"
                class="flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-sm transition-colors"
                :class="
                  n === pageSize
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text hover:bg-muted'
                "
                @click="selectPageSize(n)"
              >
                {{ n }}
              </button>
            </div>
          </Transition>
        </div>

        <div v-if="showColumnToggle" ref="columnToggleRef" class="relative">
          <button
            type="button"
            class="border-border bg-surface text-text-muted hover:text-text hover:bg-muted hover:shadow-sm flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-all duration-300 ease-out active:scale-95"
            aria-haspopup="true"
            :aria-expanded="showColumnMenu"
            @click="showColumnMenu = !showColumnMenu"
          >
            <AppIcon name="icon-[heroicons-outline--view-columns]" :size="1" />
            <span class="text-text-muted">{{ visibleToggleableCount }}/{{ toggleableColumns.length }}</span>
          </button>
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-1"
          >
            <div
              v-if="showColumnMenu"
              class="border-border bg-surface absolute start-0 bottom-full z-50 mb-1.5 min-w-[13rem] origin-bottom-left rounded-xl border p-1 shadow-xl shadow-black/8"
            >
              <div class="flex items-center justify-between px-3 py-2">
                <p class="text-text-muted text-xs font-semibold">Columns</p>
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 scale-90"
                  enter-to-class="opacity-100 scale-100"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 scale-100"
                  leave-to-class="opacity-0 scale-90"
                >
                  <span
                    v-if="columnSavedHint"
                    class="text-success bg-success/10 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium"
                  >
                    <AppIcon name="icon-[heroicons-outline--check]" :size="0.625" />
                    Saved
                  </span>
                </Transition>
              </div>
              <div class="border-border border-t" />
              <div class="py-1">
                <button
                  v-for="col in toggleableColumns"
                  :key="col.key"
                  type="button"
                  class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                  :class="[
                    visibleColumnsSet.has(col.key)
                      ? 'text-text hover:bg-muted/60'
                      : 'text-text-muted/60 hover:bg-muted/40',
                    isLastVisibleColumn(col.key) ? 'cursor-not-allowed opacity-50 hover:bg-transparent' : '',
                  ]"
                  :disabled="isLastVisibleColumn(col.key)"
                  :aria-disabled="isLastVisibleColumn(col.key) || undefined"
                  :title="isLastVisibleColumn(col.key) ? 'At least one column must stay visible' : undefined"
                  @click="toggleColumn(col.key)"
                >
                  <span>{{ col.label }}</span>
                  <span
                    class="flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200"
                    :class="visibleColumnsSet.has(col.key) ? 'bg-accent' : 'bg-border'"
                  >
                    <span
                      class="size-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                      :class="visibleColumnsSet.has(col.key) ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </span>
                </button>
              </div>
              <div class="border-border border-t" />
              <button
                type="button"
                class="text-text-muted hover:bg-muted/60 hover:text-text mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors"
                @click="resetColumnVisibility"
              >
                <AppIcon name="icon-[heroicons-outline--arrow-path]" :size="0.875" />
                Reset defaults
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <div v-if="showPagination" class="flex items-center gap-1.5">
        <AppButton
          icon="icon-[heroicons-outline--chevron-left]"
          tooltip="Previous"
          variant="ghost"
          size="sm"
          icon-only
          :disabled="!canGoPrev"
          @click="goToPrev"
        />
        <template v-if="!serverPaginated">
          <button
            v-for="page in clientVisiblePages"
            :key="page"
            type="button"
            class="flex size-8 items-center justify-center rounded-lg text-sm font-medium transition-colors"
            :class="
              page === clientPage
                ? 'bg-accent text-white'
                : 'text-text-muted hover:bg-muted hover:text-text'
            "
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
        </template>
        <span v-else class="text-text px-2 text-sm font-medium tabular-nums">{{ props.pageNumber }}</span>
        <AppButton
          icon="icon-[heroicons-outline--chevron-right]"
          tooltip="Next"
          variant="ghost"
          size="sm"
          icon-only
          :disabled="!canGoNext"
          @click="goToNext"
        />
      </div>
    </div>

    <!-- Truncate expand modal -->
    <AppModal
      :is-open="truncateModalOpen"
      :title="truncateModalTitle"
      max-width="sm"
      @close="truncateModalOpen = false"
    >
      <p dir="auto" class="text-text whitespace-pre-wrap text-sm leading-relaxed">
        {{ truncateModalContent }}
      </p>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, useSlots, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { z } from 'zod';
import { onClickOutside } from '@vueuse/core';
import { usePagination } from '@/composables/usePagination';
import { useDebounce } from '@/composables/useDebounce';
import { useLocalStorage } from '@/composables/useLocalStorage';
import { useConfirm } from '@/composables/useConfirm';

import AppButton from './AppButton.vue';
import AppIcon from './AppIcon.vue';
import AppTooltip from './AppTooltip.vue';
import AppModal from './AppModal.vue';
import AppPopover from './AppPopover.vue';
import AppCheckbox from './AppCheckbox.vue';
import AppBadge from './AppBadge.vue';
import AppSpinner from './AppSpinner.vue';
import AppTableFilters from './AppTableFilters.vue';
import { display } from '@/utils/display';
import type { FilterDef, FilterValue, ActiveFilters } from './AppTableFilters.vue';

export type { FilterDef, FilterValue, ActiveFilters };
export type { FilterType } from './AppTableFilters.vue';

type AppButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'ghost'
  | 'muted'
  | 'danger'
  | 'success'
  | 'surface'
  | 'outline';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'surface'
  | 'outline'
  | 'muted';

export interface EditableCellConfig {
  /** 'boolean' renders a Yes/No confirm popover; 'select' renders a list of options. */
  type: 'boolean' | 'select';
  trueLabel?: string;
  falseLabel?: string;
  trueVariant?: BadgeVariant;
  falseVariant?: BadgeVariant;
  options?: { label: string; value: any; variant?: BadgeVariant }[];
  onChange: (row: any, value: any) => void | Promise<void>;
  disabled?: (row: any) => boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  hideable?: boolean;
  defaultHidden?: boolean;
  class?: string;
  truncate?: boolean;
  editable?: EditableCellConfig;
}

export interface RowAction {
  key?: string;
  label: string;
  icon?: string;
  variant?: AppButtonVariant;
  danger?: boolean;
  onClick: (row: any) => void | Promise<void>;
  hidden?: (row: any) => boolean;
  disabled?: (row: any) => boolean;
  confirm?:
    | boolean
    | { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string };
}

export interface BulkAction {
  key?: string;
  label: string;
  icon?: string;
  variant?: AppButtonVariant;
  danger?: boolean;
  onClick: (rows: any[], keys: (string | number)[]) => void | Promise<void>;
  disabled?: (rows: any[]) => boolean;
  confirm?:
    | boolean
    | { title?: string; message?: string; confirmLabel?: string; cancelLabel?: string };
}

interface Props {
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  outlined?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  paginated?: boolean;
  itemsPerPage?: number;
  emptyMessage?: string;
  loadingMessage?: string;
  ofLabel?: string;
  rowKey?: string | ((row: any) => string | number);
  serverPaginated?: boolean;
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  showColumnToggle?: boolean;
  columnsVisibilityKey?: string;
  pageSizeOptions?: number[];
  filters?: FilterDef[];
  actions?: RowAction[];
  maxInlineActions?: number;
  actionsLabel?: string;
  selectable?: boolean;
  selected?: (string | number)[];
  bulkActions?: BulkAction[];
  selectionMode?: 'page' | 'all';
  filtersInToolbar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [],
  data: () => [],
  loading: false,
  outlined: true,
  searchable: false,
  searchPlaceholder: 'Search...',
  paginated: false,
  itemsPerPage: 10,
  emptyMessage: 'No data available',
  loadingMessage: 'Loading...',
  ofLabel: 'of',
  rowKey: 'id',
  serverPaginated: false,
  pageNumber: 1,
  pageSize: 15,
  totalCount: 0,
  totalPages: 1,
  showColumnToggle: false,
  columnsVisibilityKey: '',
  pageSizeOptions: () => [10, 15, 25, 50],
  filters: () => [],
  actions: () => [],
  maxInlineActions: 2,
  actionsLabel: '',
  selectable: false,
  selected: undefined,
  bulkActions: () => [],
  selectionMode: 'page',
  filtersInToolbar: true,
});

const emit = defineEmits<{
  pageChange: [payload: { pageNumber: number; pageSize: number }];
  search: [query: string];
  'update:selected': [keys: (string | number)[]];
  filterChange: [filters: ActiveFilters];
  selectionChange: [payload: { keys: (string | number)[]; rows: any[] }];
}>();

const slots = useSlots();
const { confirm } = useConfirm();

// ── Refs ──────────────────────────────────────────────────────────────────────
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const sortKey = ref<string | null>(null);
const sortOrder = ref<'asc' | 'desc'>('asc');
const showColumnMenu = ref(false);
const columnToggleRef = ref<HTMLElement | null>(null);
const showPageSizeMenu = ref(false);
const pageSizeRef = ref<HTMLElement | null>(null);
const truncateModalOpen = ref(false);
const truncateModalTitle = ref('');
const truncateModalContent = ref('');
const tableScrollRef = ref<HTMLElement | null>(null);
const scrollAtStart = ref(true);
const scrollAtEnd = ref(true);

onClickOutside(columnToggleRef, () => { showColumnMenu.value = false; });
onClickOutside(pageSizeRef, () => { showPageSizeMenu.value = false; });

function openTruncateModal(title: string, content: string) {
  truncateModalTitle.value = title;
  truncateModalContent.value = content;
  truncateModalOpen.value = true;
}

// ── Horizontal scroll affordance (mobile sticky columns) ───────────────────────
function updateScrollEdges() {
  const el = tableScrollRef.value;
  if (!el) {
    scrollAtStart.value = true;
    scrollAtEnd.value = true;
    return;
  }
  scrollAtStart.value = el.scrollLeft <= 1;
  scrollAtEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
}

onMounted(() => {
  updateScrollEdges();
  window.addEventListener('resize', updateScrollEdges);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollEdges);
});

// ── Filters ───────────────────────────────────────────────────────────────────
const activeFilters = ref<ActiveFilters>({});

const hasActiveFilters = computed(() =>
  Object.values(activeFilters.value).some((v) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.values(v).some((x) => x !== null && x !== '');
    return true;
  }),
);

watch(
  activeFilters,
  (val) => {
    clientPag.first();
    emit('filterChange', { ...val });
  },
  { deep: true },
);

// ── Selection ─────────────────────────────────────────────────────────────────
const selectedSet = ref<Set<string | number>>(new Set(props.selected ?? []));

watch(
  () => props.selected,
  (val) => { selectedSet.value = new Set(val ?? []); },
  { deep: true },
);

const selectedRows = computed(() =>
  props.data.filter((row, i) => selectedSet.value.has(getRowKey(row, i))),
);

function emitSelectionChange() {
  const keys = [...selectedSet.value];
  emit('update:selected', keys);
  emit('selectionChange', { keys, rows: selectedRows.value });
}

const selectedOnPageCount = computed(
  () => displayData.value.filter((row, i) => selectedSet.value.has(getRowKey(row, i))).length,
);

function selectedRowLabel(key: string | number): string {
  const idx = props.data.findIndex((row, i) => getRowKey(row, i) === key);
  if (idx === -1) return `#${key}`;
  const labelColumn = effectiveColumns.value.find((c) => c.key !== '__select__' && c.key !== 'actions');
  if (!labelColumn) return `#${key}`;
  const value = display(getValue(props.data[idx], labelColumn.key));
  return value === '' ? `#${key}` : String(value);
}

function removeFromSelection(key: string | number) {
  const next = new Set(selectedSet.value);
  next.delete(key);
  selectedSet.value = next;
  emitSelectionChange();
}

const isAllSelected = computed(() => {
  const current = props.selectionMode === 'page' ? displayData.value : filteredData.value;
  if (current.length === 0) return false;
  return current.every((row, i) => selectedSet.value.has(getRowKey(row, i)));
});

const isPartialSelected = computed(() => {
  const current = props.selectionMode === 'page' ? displayData.value : filteredData.value;
  if (current.length === 0) return false;
  const count = current.filter((row, i) => selectedSet.value.has(getRowKey(row, i))).length;
  return count > 0 && count < current.length;
});

function isRowSelected(row: any, index: number): boolean {
  return selectedSet.value.has(getRowKey(row, index));
}

function toggleRow(row: any, index: number) {
  const k = getRowKey(row, index);
  const next = new Set(selectedSet.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  selectedSet.value = next;
  emitSelectionChange();
}

function toggleAll() {
  const current = props.selectionMode === 'page' ? displayData.value : filteredData.value;
  const next = new Set(selectedSet.value);
  if (isAllSelected.value) {
    current.forEach((row, i) => next.delete(getRowKey(row, i)));
  } else {
    current.forEach((row, i) => next.add(getRowKey(row, i)));
  }
  selectedSet.value = next;
  emitSelectionChange();
}

function clearSelection() {
  selectedSet.value = new Set();
  emitSelectionChange();
}

watch(
  () => props.data,
  (newData) => {
    if (props.serverPaginated) return;
    const validKeys = new Set(
      newData.map((row) =>
        typeof props.rowKey === 'function'
          ? props.rowKey(row)
          : row[props.rowKey as string],
      ),
    );
    const before = selectedSet.value.size;
    const pruned = new Set([...selectedSet.value].filter((k) => validKeys.has(k)));
    if (pruned.size !== before) {
      selectedSet.value = pruned;
      emitSelectionChange();
    }
  },
);

// ── Actions ───────────────────────────────────────────────────────────────────
const pendingActions = ref<Set<string>>(new Set());

function actionKey(action: RowAction, row: any, index: number): string {
  return `${action.key ?? action.label}-${getRowKey(row, index)}`;
}

function isActionPending(action: RowAction, row: any, index: number): boolean {
  return pendingActions.value.has(actionKey(action, row, index));
}

function visibleRowActions(row: any): RowAction[] {
  return props.actions.filter((a) => !a.hidden?.(row));
}

function inlineRowActions(row: any): RowAction[] {
  return visibleRowActions(row).slice(0, props.maxInlineActions);
}

function overflowRowActions(row: any): RowAction[] {
  return visibleRowActions(row).slice(props.maxInlineActions);
}

async function handleRowAction(action: RowAction, row: any, index: number) {
  const key = actionKey(action, row, index);
  if (pendingActions.value.has(key)) return;

  if (action.confirm) {
    const opts = typeof action.confirm === 'object' ? action.confirm : {};
    const confirmed = await confirm(opts);
    if (!confirmed) return;
  }

  pendingActions.value = new Set([...pendingActions.value, key]);
  try {
    await action.onClick(row);
  } finally {
    const next = new Set(pendingActions.value);
    next.delete(key);
    pendingActions.value = next;
  }
}

async function handleBulkAction(action: BulkAction) {
  if (action.confirm) {
    const opts = typeof action.confirm === 'object' ? action.confirm : {};
    const confirmed = await confirm(opts);
    if (!confirmed) return;
  }
  await action.onClick(selectedRows.value, [...selectedSet.value]);
}

// ── Inline cell status editing ──────────────────────────────────────────────────
const pendingCellEdits = ref<Set<string>>(new Set());

function cellEditKey(column: TableColumn, row: any, index: number): string {
  return `${column.key}-${getRowKey(row, index)}`;
}

function isCellEditPending(column: TableColumn, row: any, index: number): boolean {
  return pendingCellEdits.value.has(cellEditKey(column, row, index));
}

function editableVariant(column: TableColumn, row: any): BadgeVariant {
  const cfg = column.editable!;
  if (cfg.type === 'boolean') {
    const value = Boolean(getValue(row, column.key));
    return value ? (cfg.trueVariant ?? 'success') : (cfg.falseVariant ?? 'muted');
  }
  const current = getValue(row, column.key);
  const opt = cfg.options?.find((o) => String(o.value) === String(current));
  return opt?.variant ?? 'surface';
}

function editableLabel(column: TableColumn, row: any): string {
  const cfg = column.editable!;
  if (cfg.type === 'boolean') {
    const value = Boolean(getValue(row, column.key));
    return value ? (cfg.trueLabel ?? 'Active') : (cfg.falseLabel ?? 'Inactive');
  }
  const current = getValue(row, column.key);
  const opt = cfg.options?.find((o) => String(o.value) === String(current));
  return opt?.label ?? String(current);
}

function editableBooleanTargetLabel(column: TableColumn, row: any): string {
  const cfg = column.editable!;
  const value = Boolean(getValue(row, column.key));
  return value ? (cfg.falseLabel ?? 'Inactive') : (cfg.trueLabel ?? 'Active');
}

async function handleCellEdit(column: TableColumn, row: any, index: number, value: any, close: () => void) {
  const key = cellEditKey(column, row, index);
  if (pendingCellEdits.value.has(key)) return;

  pendingCellEdits.value = new Set([...pendingCellEdits.value, key]);
  close();
  try {
    await column.editable!.onChange(row, value);
  } finally {
    const next = new Set(pendingCellEdits.value);
    next.delete(key);
    pendingCellEdits.value = next;
  }
}

// ── Column visibility ─────────────────────────────────────────────────────────
const STORAGE_PREFIX = 'app-table-columns-';
const columnVisibilitySchema = z.record(z.string(), z.boolean());
const fallbackColumnVisibility = ref<Record<string, boolean>>({});
const storedColumnVisibility = props.columnsVisibilityKey
  ? useLocalStorage(STORAGE_PREFIX + props.columnsVisibilityKey, {}, columnVisibilitySchema)
  : null;
const columnVisibility = storedColumnVisibility ?? fallbackColumnVisibility;
const columnSavedHint = ref(false);
let savedHintTimer: ReturnType<typeof setTimeout> | null = null;

function showSavedHint() {
  columnSavedHint.value = true;
  if (savedHintTimer) clearTimeout(savedHintTimer);
  savedHintTimer = setTimeout(() => { columnSavedHint.value = false; }, 1500);
}

const toggleableColumns = computed(() => {
  if (!Array.isArray(props.columns)) return [];
  return props.columns.filter((c) => c.hideable !== false);
});

const visibleColumnsSet = computed(() => {
  const saved = columnVisibility.value;
  const set = new Set<string>();
  if (!Array.isArray(props.columns)) return set;
  for (const col of props.columns) {
    if (col.hideable === false) {
      set.add(col.key);
    } else if (saved[col.key] !== undefined) {
      if (saved[col.key]) set.add(col.key);
    } else if (!col.defaultHidden) {
      set.add(col.key);
    }
  }
  return set;
});

const visibleColumns = computed(() => {
  if (!Array.isArray(props.columns)) return [];
  return props.columns.filter((c) => visibleColumnsSet.value.has(c.key));
});

const visibleToggleableCount = computed(
  () => toggleableColumns.value.filter((c) => visibleColumnsSet.value.has(c.key)).length,
);

function toggleColumn(key: string) {
  if (isLastVisibleColumn(key)) return;
  const currentlyVisible = visibleColumnsSet.value.has(key);
  columnVisibility.value = { ...columnVisibility.value, [key]: !currentlyVisible };
  showSavedHint();
}

function isLastVisibleColumn(key: string): boolean {
  return visibleColumnsSet.value.has(key) && visibleColumnsSet.value.size <= 1;
}

function resetColumnVisibility() {
  columnVisibility.value = {};
  showSavedHint();
}

// ── effectiveColumns ──────────────────────────────────────────────────────────
const showActionsColumn = computed(
  () =>
    props.columns.some((c) => c.key === 'actions') ||
    props.actions.length > 0 ||
    !!slots['cell-actions'],
);

const effectiveColumns = computed<TableColumn[]>(() => {
  const cols: TableColumn[] = [...visibleColumns.value];

  if (props.selectable) {
    cols.unshift({ key: '__select__', label: '', hideable: false });
  }

  if (showActionsColumn.value && !cols.some((c) => c.key === 'actions')) {
    cols.push({ key: 'actions', label: props.actionsLabel, hideable: false });
  }

  return cols;
});

// ── Sort ──────────────────────────────────────────────────────────────────────
const isColumnSortable = (column: TableColumn): boolean => column.sortable === true;

const getAriaSort = (
  column: TableColumn,
): 'ascending' | 'descending' | 'none' | undefined => {
  if (!isColumnSortable(column)) return undefined;
  if (sortKey.value !== column.key) return 'none';
  return sortOrder.value === 'asc' ? 'ascending' : 'descending';
};

const handleSort = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  clientPag.first();
};

// ── Row helpers ───────────────────────────────────────────────────────────────
const getRowKey = (row: any, index: number): string | number => {
  if (typeof props.rowKey === 'function') return props.rowKey(row);
  return row[props.rowKey] ?? index;
};

const getValue = (row: any, key: string): any => {
  const keys = key.split('.');
  let value = row;
  for (const k of keys) value = value?.[k];
  return value ?? '';
};

const parseSortValue = (val: any): string | number => {
  if (val == null || val === '') return '';
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
    return new Date(val).getTime();
  return String(val).toLowerCase();
};

// ── Filter predicates ─────────────────────────────────────────────────────────
function passesFilters(row: any): boolean {
  for (const filter of props.filters) {
    const val = activeFilters.value[filter.key] as FilterValue;
    if (val === null || val === undefined || val === '') continue;
    if (Array.isArray(val) && val.length === 0) continue;
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (Object.values(val).every((v) => v === null || v === '')) continue;
    }

    const raw = getValue(row, filter.key);

    switch (filter.type) {
      case 'text':
        if (typeof val === 'string' && !String(raw).toLowerCase().includes(val.toLowerCase()))
          return false;
        break;
      case 'number': {
        const { min, max } = val as { min: number | null; max: number | null };
        const num = Number(raw);
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        break;
      }
      case 'select':
        if (val !== '' && String(raw) !== String(val)) return false;
        break;
      case 'multiselect': {
        const arr = val as (string | number)[];
        if (arr.length > 0 && !arr.map(String).includes(String(raw))) return false;
        break;
      }
      case 'boolean':
        if (typeof val === 'boolean' && Boolean(raw) !== val) return false;
        break;
      case 'dateRange': {
        const { from, to } = val as { from: string | null; to: string | null };
        const rowTime = new Date(raw).getTime();
        if (from && rowTime < new Date(from).getTime()) return false;
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          if (rowTime > toDate.getTime()) return false;
        }
        break;
      }
    }
  }
  return true;
}

// ── Data pipeline ─────────────────────────────────────────────────────────────
const filteredData = computed(() => {
  if (!Array.isArray(props.data)) return [];
  let result = [...props.data];

  if (!props.serverPaginated) {
    if (props.filters.length > 0) result = result.filter(passesFilters);

    if (props.searchable && searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      result = result.filter((row) =>
        props.columns.some((col) =>
          String(getValue(row, col.key)).toLowerCase().includes(q),
        ),
      );
    }
  }

  if (sortKey.value) {
    result.sort((a, b) => {
      const aVal = parseSortValue(getValue(a, sortKey.value!));
      const bVal = parseSortValue(getValue(b, sortKey.value!));
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortOrder.value === 'asc' ? cmp : -cmp;
    });
  }

  return result;
});

const clientTotal = computed(() => filteredData.value.length);
const clientItemsPerPage = computed(() => props.itemsPerPage);

const clientPag = usePagination({ total: clientTotal, pageSize: clientItemsPerPage });
const clientPage = clientPag.page;
const clientTotalPages = clientPag.totalPages;
const clientIsFirst = clientPag.isFirst;
const clientIsLast = clientPag.isLast;
const clientRange = clientPag.range;
const clientVisiblePages = clientPag.visiblePages;

const clientPaginatedData = computed(() =>
  props.paginated ? clientPag.paginate(filteredData.value) : filteredData.value,
);

const displayData = computed(() =>
  props.serverPaginated ? props.data : clientPaginatedData.value,
);

watch([displayData, effectiveColumns], () => nextTick(updateScrollEdges));

const skeletonRows = computed(() => Math.min(props.itemsPerPage, 5));

// ── Pagination display ────────────────────────────────────────────────────────
const showPagination = computed(() => {
  if (props.serverPaginated) return props.totalCount > 0;
  return props.paginated && clientTotalPages.value > 1;
});

const paginationStart = computed(() => {
  if (props.serverPaginated)
    return props.totalCount === 0 ? 0 : (props.pageNumber - 1) * props.pageSize + 1;
  return clientRange.value.start;
});

const paginationEnd = computed(() => {
  if (props.serverPaginated)
    return Math.min(props.pageNumber * props.pageSize, props.totalCount);
  return clientRange.value.end;
});

const paginationTotal = computed(() =>
  props.serverPaginated ? props.totalCount : clientTotal.value,
);

const canGoPrev = computed(() =>
  props.serverPaginated ? props.pageNumber > 1 : !clientIsFirst.value,
);
const canGoNext = computed(() =>
  props.serverPaginated ? props.pageNumber < props.totalPages : !clientIsLast.value,
);

const goToPage = (p: number) => clientPag.goTo(p);

const goToPrev = () => {
  if (props.serverPaginated) {
    if (props.pageNumber > 1)
      emit('pageChange', { pageNumber: props.pageNumber - 1, pageSize: props.pageSize });
  } else {
    clientPag.prev();
  }
};

const goToNext = () => {
  if (props.serverPaginated) {
    if (props.pageNumber < props.totalPages)
      emit('pageChange', { pageNumber: props.pageNumber + 1, pageSize: props.pageSize });
  } else {
    clientPag.next();
  }
};

function selectPageSize(size: number) {
  showPageSizeMenu.value = false;
  emit('pageChange', { pageNumber: 1, pageSize: size });
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(searchQuery, () => { clientPag.first(); });

const debouncedSearch = useDebounce(searchQuery, 500);
watch(debouncedSearch, (q) => {
  if (props.serverPaginated) emit('search', q ?? '');
});
</script>

<style scoped>
/* Sticky actions column (end / right) */
.sticky-actions-th,
.sticky-actions-td {
  position: sticky;
  inset-inline-end: 0;
}

.sticky-actions-th {
  z-index: 11;
  background: color-mix(in srgb, var(--color-muted, #f3f4f6) 60%, transparent);
}

.sticky-actions-td {
  z-index: 10;
  background: var(--color-surface, #fff);
}

tr:hover > .sticky-actions-td {
  background: color-mix(
    in srgb,
    var(--color-accent, #4f46e5) 3%,
    var(--color-surface, #fff)
  );
}

.sticky-actions-th::before,
.sticky-actions-td::before {
  content: '';
  position: absolute;
  top: 0;
  inset-inline-start: -1.25rem;
  bottom: 0;
  width: 1.25rem;
  pointer-events: none;
  background: linear-gradient(to right, transparent, rgb(0 0 0 / 0.04));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.is-not-scrolled-to-end .sticky-actions-th::before,
.is-not-scrolled-to-end .sticky-actions-td::before {
  opacity: 1;
  background: linear-gradient(to right, transparent, rgb(0 0 0 / 0.16));
}

/* Sticky select column (start / left) */
.sticky-select-th,
.sticky-select-td {
  position: sticky;
  inset-inline-start: 0;
}

.sticky-select-th {
  z-index: 11;
  background: color-mix(in srgb, var(--color-muted, #f3f4f6) 60%, transparent);
}

.sticky-select-td {
  z-index: 10;
  background: var(--color-surface, #fff);
}

tr:hover > .sticky-select-td {
  background: color-mix(
    in srgb,
    var(--color-accent, #4f46e5) 3%,
    var(--color-surface, #fff)
  );
}

.sticky-select-th::after,
.sticky-select-td::after {
  content: '';
  position: absolute;
  top: 0;
  inset-inline-end: -1.25rem;
  bottom: 0;
  width: 1.25rem;
  pointer-events: none;
  background: linear-gradient(to left, transparent, rgb(0 0 0 / 0.04));
  opacity: 0;
  transition: opacity 0.15s ease;
}

.is-scrolled-from-start .sticky-select-th::after,
.is-scrolled-from-start .sticky-select-td::after {
  opacity: 1;
  background: linear-gradient(to left, transparent, rgb(0 0 0 / 0.16));
}

.table-row-data {
  position: relative;
  z-index: 0;
}

.table-row-data:hover {
  z-index: 12;
}
</style>
