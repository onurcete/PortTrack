import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useThemeStore } from '../stores/themeStore';
import { haptic } from '../utils/haptics';

export interface SelectOption {
  key: string;
  label: string;
  subLabel?: string;
}

interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function SelectModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SelectModalProps) {
  const { theme } = useThemeStore();

  const handleSelect = (key: string) => {
    haptic.selection();
    onSelect(key);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <Text style={[styles.title, { color: theme.text.primary }]}>{title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceMuted }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Options List */}
              <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                {options.map((opt) => {
                  const isSelected = selectedValue === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.optionRow,
                        {
                          borderBottomColor: theme.borderSubtle,
                          backgroundColor: isSelected ? theme.brand.soft : 'transparent',
                        },
                      ]}
                      onPress={() => handleSelect(opt.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionTextContainer}>
                        <Text
                          style={[
                            styles.optionLabel,
                            {
                              color: isSelected ? theme.brand.primary : theme.text.primary,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {Boolean(opt.subLabel) && (
                          <Text style={[styles.optionSubLabel, { color: theme.text.muted }]}>
                            {opt.subLabel}
                          </Text>
                        )}
                      </View>
                      {isSelected && <Check size={18} color={theme.brand.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    paddingVertical: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 13.5,
  },
  optionSubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
