<template>
 <div class="flex flex-col gap-1.5 w-full">
 <label v-if="label" class="text-sm font-medium text-text">
 {{ label }}
 </label>
 
 <div class="flex flex-wrap items-center gap-3">
 <input
 ref="inputRef"
 type="file"
 :accept="accept"
 :multiple="multiple"
 class="hidden"
 @change="handleChange"
 />
 
 <!-- Upload Button -->
 <AppButton
 type="button"
 variant="outline"
 icon="icon-[heroicons-outline--paper-clip]"
 :disabled="readonly || loading"
 :label="loading ? loadingLabel : buttonLabel"
 @click="inputRef?.click()"
 />

 <!-- File Displays -->
 <template v-if="Array.isArray(modelValue)">
 <FileDisplay
 v-for="(file, index) in modelValue"
 :key="index"
 :fileName="getFileName(file)"
 :showRemove="!readonly"
 @remove="removeFile(index)"
 />
 </template>
 <FileDisplay
 v-else-if="modelValue"
 :fileName="getFileName(modelValue)"
 :showRemove="!readonly"
 @remove="removeFile()"
 />
 </div>

 <span
 v-if="error"
 role="alert"
 class="text-sm text-error"
 >
 {{ error }}
 </span>
 </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '../AppButton.vue'
import FileDisplay from './FileDisplay.vue'

const props = withDefaults(
 defineProps<{
 modelValue?: any | any[]
 label?: string
 accept?: string
 multiple?: boolean
 readonly?: boolean
 loading?: boolean
 error?: string
 buttonLabel?: string
 loadingLabel?: string
 }>(),
 {
 buttonLabel: 'Attach file',
 loadingLabel: 'Uploading...',
 multiple: false,
 readonly: false,
 }
)

const emit = defineEmits<{
 'update:modelValue': [value: any | any[]]
 'change': [files: File | File[]]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

function getFileName(file: any): string {
 if (typeof file === 'string') return file
 if (file instanceof File) return file.name
 if (file && typeof file === 'object' && file.name) return file.name
 return 'Unknown file'
}

function handleChange(event: Event) {
 const input = event.target as HTMLInputElement
 if (!input.files?.length) return

 if (props.multiple) {
 const files = Array.from(input.files)
 const currentValues = Array.isArray(props.modelValue) ? props.modelValue : (props.modelValue ? [props.modelValue] : [])
 const nextValues = [...currentValues, ...files]
 emit('update:modelValue', nextValues)
 emit('change', files)
 } else {
 const file = input.files[0]
 emit('update:modelValue', file)
 emit('change', file)
 }
 
 input.value = ''
}

function removeFile(index?: number) {
 if (props.multiple && Array.isArray(props.modelValue) && index !== undefined) {
 const nextValues = [...props.modelValue]
 nextValues.splice(index, 1)
 emit('update:modelValue', nextValues)
 } else {
 emit('update:modelValue', null)
 }
}
</script>
