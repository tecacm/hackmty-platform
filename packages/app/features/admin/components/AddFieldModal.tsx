import * as React from 'react'
import { View, Text, Modal, TextInput, Pressable, Platform, ScrollView } from 'react-native'
import { PillButton } from '../../../components/pill-button'

type Translation = { key: string; value: string }
type OptionRow = { value: string; translations: Translation[] }

interface AddFieldModalProps {
  visible: boolean; onClose: () => void; selectedFormRole: string
  newFieldKey: string; setNewFieldKey: (value: string) => void
  newFieldLabelTranslations: Translation[]; setNewFieldLabelTranslations: (value: Translation[]) => void
  newFieldSubtitleTranslations: Translation[]; setNewFieldSubtitleTranslations: (value: Translation[]) => void
  newFieldSubtitleRich: boolean; setNewFieldSubtitleRich: (value: boolean) => void
  newFieldConditionField: string; setNewFieldConditionField: (value: string) => void
  newFieldConditionOperator: string; setNewFieldConditionOperator: (value: string) => void
  newFieldConditionValue: string; setNewFieldConditionValue: (value: string) => void
  newFieldUiMetadata: string; setNewFieldUiMetadata: (value: string) => void
  newFieldOptions: OptionRow[]; setNewFieldOptions: (value: OptionRow[]) => void
  newFieldType: string; setNewFieldType: (value: string) => void
  newFieldRequired: boolean; setNewFieldRequired: (value: boolean) => void
  newFieldSection: string; setNewFieldSection: (value: string) => void
  formSectionsList: any[]; editingFieldId: string | null
  allFormFields: any[]
  handleAddFieldToRole: () => void; isAddingField: boolean
}

const inputStyle = { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0f172a' } as const
const choiceTypes = ['select', 'multiselect', 'radio', 'segmented']

export function AddFieldModal(props: AddFieldModalProps) {
  const isChoice = choiceTypes.includes(props.newFieldType)
  const updateOptionValue = (index: number, value: string) => {
    props.setNewFieldOptions(props.newFieldOptions.map((option, i) => i === index ? { ...option, value } : option))
  }
  const mergeMetadata = (patch: Record<string, any>) => {
    try {
      const current = props.newFieldUiMetadata.trim() ? JSON.parse(props.newFieldUiMetadata) : {}
      props.setNewFieldUiMetadata(JSON.stringify({ ...current, ...patch }, null, 2))
    } catch {
      // Preserve invalid input so Save can show the validation error instead of silently replacing it.
    }
  }

  return (
    <Modal visible={props.visible} animationType="fade" transparent onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 640, maxHeight: '92%', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', ...Platform.select({ web: { boxShadow: '0 20px 50px rgba(0,0,0,0.2)' } }) }}>
          <View style={{ padding: 22, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{props.editingFieldId ? 'Edit Field' : 'Add Question Field'}</Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Role: {(props.selectedFormRole || 'hacker').toUpperCase()}</Text>
            </View>
            <Pressable onPress={props.onClose} hitSlop={8}><Text style={{ fontSize: 20, color: '#94a3b8', fontWeight: '800' }}>×</Text></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>FIELD KEY</Text>
              <TextInput editable={!props.editingFieldId} style={[inputStyle, props.editingFieldId ? { opacity: 0.6 } : null]} placeholder="e.g. dietary_restrictions" value={props.newFieldKey} onChangeText={props.setNewFieldKey} autoCapitalize="none" />
              {!!props.editingFieldId && <Text style={{ fontSize: 11, color: '#64748b' }}>Field keys are permanent once created.</Text>}
            </View>

            <TranslationsEditor title="QUESTION LABEL" translations={props.newFieldLabelTranslations} setTranslations={props.setNewFieldLabelTranslations} placeholder="e.g. What is your dietary restriction?" />
            <TranslationsEditor title="SUBTITLE (OPTIONAL)" translations={props.newFieldSubtitleTranslations} setTranslations={props.setNewFieldSubtitleTranslations} placeholder="Helpful context for the applicant" />

            <Pressable onPress={() => props.setNewFieldSubtitleRich(!props.newFieldSubtitleRich)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#5a0061', backgroundColor: props.newFieldSubtitleRich ? '#5a0061' : '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{props.newFieldSubtitleRich ? '✓' : ''}</Text></View>
              <Text style={{ color: '#334155', fontSize: 13, fontWeight: '700' }}>Store subtitle as rich text</Text>
            </Pressable>
            {props.newFieldSubtitleRich && <Text style={{ marginTop: -12, fontSize: 11, color: '#64748b' }}>The subtitle is saved as a composite rich-text block, ready for the applicant form.</Text>}

            <View style={{ gap: 7 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>FIELD TYPE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['text', 'textarea', 'select', 'multiselect', 'radio', 'segmented', 'autocomplete', 'file', 'checkbox'].map((type) => (
                  <Pressable key={type} onPress={() => props.setNewFieldType(type)} style={{ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: props.newFieldType === type ? '#5a0061' : '#f1f5f9', borderWidth: 1, borderColor: props.newFieldType === type ? '#5a0061' : '#cbd5e1' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: props.newFieldType === type ? '#fff' : '#334155' }}>{type.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ gap: 7 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>DEFAULT SECTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 7 }}>
                {props.formSectionsList.map((section) => {
                  const selected = props.newFieldSection === section.id
                  const text = typeof section.label === 'object' ? section.label.en || section.id : section.label || section.id
                  return <Pressable key={section.id} onPress={() => props.setNewFieldSection(section.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: selected ? 'rgba(90,0,97,0.1)' : '#f8fafc', borderWidth: 1, borderColor: selected ? '#5a0061' : '#cbd5e1' }}><Text style={{ fontSize: 12, color: selected ? '#5a0061' : '#475569', fontWeight: '700' }}>{text}</Text></Pressable>
                })}
              </View></ScrollView>
            </View>

            {isChoice && <View style={{ gap: 9, backgroundColor: '#faf6fd', borderWidth: 1, borderColor: 'rgba(90,0,97,0.15)', borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#5a0061' }}>OPTIONS</Text>
              {props.newFieldOptions.map((option, index) => <View key={index} style={{ gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderColor: 'rgba(90,0,97,0.1)' }}>
                <TextInput style={inputStyle} placeholder="option value" value={option.value} onChangeText={(value) => updateOptionValue(index, value)} />
                <TranslationsEditor title="OPTION LABEL" translations={option.translations} setTranslations={(translations) => props.setNewFieldOptions(props.newFieldOptions.map((item, i) => i === index ? { ...item, translations } : item))} placeholder="Option label" compact />
                <Pressable onPress={() => props.setNewFieldOptions(props.newFieldOptions.filter((_, i) => i !== index))}><Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '800' }}>Remove option</Text></Pressable>
              </View>)}
              <Pressable onPress={() => props.setNewFieldOptions([...props.newFieldOptions, { value: '', translations: [{ key: 'en', value: '' }] }])}><Text style={{ color: '#5a0061', fontSize: 12, fontWeight: '800' }}>+ Add option</Text></Pressable>
            </View>}

            <View style={{ gap: 9, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>CONDITIONAL LOGIC</Text>
              <Text style={{ fontSize: 11, color: '#64748b' }}>Leave the controlling field blank to always show this field.</Text>
              <TextInput style={inputStyle} value={props.newFieldConditionField} onChangeText={props.setNewFieldConditionField} placeholder="Controlling field key (e.g. age)" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 6 }}>{props.allFormFields.filter((field) => field.id !== props.newFieldKey).map((field) => <Pressable key={field.id} onPress={() => props.setNewFieldConditionField(field.id)} style={{ paddingHorizontal: 9, paddingVertical: 6, borderRadius: 7, backgroundColor: props.newFieldConditionField === field.id ? 'rgba(90,0,97,0.12)' : '#fff', borderWidth: 1, borderColor: props.newFieldConditionField === field.id ? '#5a0061' : '#cbd5e1' }}><Text style={{ fontSize: 11, fontWeight: '700', color: props.newFieldConditionField === field.id ? '#5a0061' : '#475569' }}>{field.id}</Text></Pressable>)}</View></ScrollView>
              {!!props.newFieldConditionField && <><View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>{['==', '!=', '<', '<=', '>', '>='].map((operator) => <Pressable key={operator} onPress={() => props.setNewFieldConditionOperator(operator)} style={{ minWidth: 38, alignItems: 'center', paddingVertical: 7, borderRadius: 7, borderWidth: 1, borderColor: props.newFieldConditionOperator === operator ? '#5a0061' : '#cbd5e1', backgroundColor: props.newFieldConditionOperator === operator ? 'rgba(90,0,97,0.1)' : '#fff' }}><Text style={{ fontWeight: '800', color: props.newFieldConditionOperator === operator ? '#5a0061' : '#475569' }}>{operator}</Text></Pressable>)}</View><TextInput style={inputStyle} value={props.newFieldConditionValue} onChangeText={props.setNewFieldConditionValue} placeholder="Comparison value (e.g. 18)" /></>}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>ADVANCED FIELD PROPERTIES (JSON)</Text>
              <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>Stored in `ui_metadata`. Use this for height, bucketName, fileNamePrefix, acceptedExtensions, fileSelectorProps, multiple, layout, and any future field-specific settings.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                <Pressable onPress={() => mergeMetadata({ height: 100 })} style={{ paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 7 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>+ Height</Text></Pressable>
                <Pressable onPress={() => mergeMetadata({ bucketName: 'your-bucket', fileNamePrefix: 'upload', acceptedExtensions: ['pdf'] })} style={{ paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 7 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>+ File bucket</Text></Pressable>
                <Pressable onPress={() => mergeMetadata({ fileSelectorProps: { maxSizeBytes: 5242880, acceptedExtensions: ['pdf'] } })} style={{ paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 7 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>+ File limits</Text></Pressable>
                <Pressable onPress={() => mergeMetadata({ multiple: true, layout: 'horizontal-wrap' })} style={{ paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 7 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#475569' }}>+ Radio layout</Text></Pressable>
              </View>
              <TextInput style={[inputStyle, { minHeight: 130, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', textAlignVertical: 'top' }]} value={props.newFieldUiMetadata} onChangeText={props.setNewFieldUiMetadata} multiline autoCapitalize="none" autoCorrect={false} placeholder={'{\n  "height": 100\n}'} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}><Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>Required field</Text><Pressable onPress={() => props.setNewFieldRequired(!props.newFieldRequired)} style={{ backgroundColor: props.newFieldRequired ? '#dc2626' : '#cbd5e1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}><Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>{props.newFieldRequired ? 'REQUIRED' : 'OPTIONAL'}</Text></Pressable></View>
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, borderTopWidth: 1, borderColor: '#e2e8f0' }}><PillButton title="Cancel" onPress={props.onClose} variant="outline-primary" additionalStyle={{ height: 42, width: 'auto', paddingHorizontal: 18 }} /><PillButton title={props.editingFieldId ? 'Save Field' : 'Add Field'} onPress={props.handleAddFieldToRole} isLoading={props.isAddingField} additionalStyle={{ height: 42, width: 'auto', minWidth: 130, paddingHorizontal: 22, backgroundColor: '#5a0061' }} /></View>
        </View>
      </View>
    </Modal>
  )
}

function TranslationsEditor({ title, translations, setTranslations, placeholder, compact = false }: { title: string; translations: Translation[]; setTranslations: (value: Translation[]) => void; placeholder: string; compact?: boolean }) {
  const update = (index: number, key: keyof Translation, value: string) => setTranslations(translations.map((translation, i) => i === index ? { ...translation, [key]: value } : translation))
  return <View style={{ gap: 7 }}><Text style={{ fontSize: compact ? 10 : 12, fontWeight: '800', color: '#334155' }}>{title}</Text>{translations.map((translation, index) => <View key={index} style={{ flexDirection: 'row', gap: 7 }}><TextInput style={[inputStyle, { width: 72 }]} placeholder="key" value={translation.key} onChangeText={(value) => update(index, 'key', value)} autoCapitalize="none" /><TextInput style={[inputStyle, { flex: 1 }]} placeholder={placeholder} value={translation.value} onChangeText={(value) => update(index, 'value', value)} multiline={title.includes('SUBTITLE')} />{translations.length > 1 && <Pressable onPress={() => setTranslations(translations.filter((_, i) => i !== index))} style={{ justifyContent: 'center' }}><Text style={{ color: '#dc2626', fontWeight: '800' }}>×</Text></Pressable>}</View>)}<Pressable onPress={() => setTranslations([...translations, { key: '', value: '' }])}><Text style={{ fontSize: 12, color: '#5a0061', fontWeight: '800' }}>+ Add translation</Text></Pressable></View>
}
