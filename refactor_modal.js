const fs = require('fs');
let content = fs.readFileSync('src/screens/RegistrationScreen.tsx', 'utf8');

content = content.replace(
  /const \[showErrorModal, setShowErrorModal\] = useState\(false\);\s+const \[errorMessage, setErrorMessage\] = useState\(''\);/,
  `const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: 'Error',
    message: '',
    type: 'error',
    buttonText: 'OK',
    onPress: null as (() => void) | null,
  });`
);

content = content.replace(
  /const hideModal = \(\) => \{\s+Animated\.timing\(modalAnimation, \{\s+toValue: 0,\s+duration: 200,\s+useNativeDriver: true,\s+\}\)\.start\(\(\) => \{\s+setShowErrorModal\(false\);\s+\}\);\s+\};/,
  `const hideModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalConfig(prev => ({ ...prev, visible: false }));
    });
  };

  const showCustomModal = (title: string, message: string, type: 'error' | 'success' | 'info' = 'error', buttonText: string = 'OK', onPress: (() => void) | null = null) => {
    setModalConfig({ visible: true, title, message, type: type as 'error' | 'success' | 'info', buttonText, onPress });
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };`
);

content = content.replace(
  /const showModal = \(\) => \{\s+setShowErrorModal\(true\);\s+Animated\.timing\(modalAnimation, \{\s+toValue: 1,\s+duration: 200,\s+useNativeDriver: true,\s+\}\)\.start\(\);\s+\};\s+useEffect\(\(\) => \{\s+if \(showErrorModal\) \{\s+showModal\(\);\s+\}\s+\}, \[showErrorModal\]\);/g,
  ''
);

content = content.replace(
  /setErrorMessage\((.*?)\);\s+setShowErrorModal\(true\);/g,
  `showCustomModal('Registration Error', $1, 'error');`
);

content = content.replace(
  /Alert\.alert\('OTP Sent', 'A verification OTP has been sent to your WhatsApp\.'\);/g,
  `showCustomModal('OTP Sent', 'A verification OTP has been sent to your WhatsApp.', 'success');`
);

content = content.replace(
  /Alert\.alert\('Already Registered', 'This phone number is already registered and verified\. Please sign in instead\.', \[\s+\{ text: 'Go to Sign In', onPress: \(\) => navigation\.navigate\('Login'\) \}\s+\]\);/g,
  `showCustomModal('Already Registered', 'This phone number is already registered and verified. Please sign in instead.', 'info', 'Go to Sign In', () => navigation.navigate('Login'));`
);

content = content.replace(
  /Alert\.alert\('OTP Resent', 'A new verification OTP has been sent to your WhatsApp\.'\);/g,
  `showCustomModal('OTP Resent', 'A new verification OTP has been sent to your WhatsApp.', 'success');`
);

content = content.replace(
  /Alert\.alert\('Error', (.*?)\);/g,
  `showCustomModal('Error', $1, 'error');`
);

content = content.replace(
  /<Modal visible=\{showErrorModal\} transparent=\{true\} animationType="fade" onRequestClose=\{hideModal\} statusBarTranslucent=\{true\}\>([\s\S]*?)<\/Modal>/,
  `<Modal visible={modalConfig.visible} transparent={true} animationType="fade" onRequestClose={hideModal} statusBarTranslucent={true}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideModal}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Animated.View style={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: modalConfig.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : modalConfig.type === 'success' ? 'rgba(56, 161, 105, 0.1)' : 'rgba(49, 130, 206, 0.1)' }]}>
                  <Icon name={modalConfig.type === 'error' ? "error-outline" : modalConfig.type === 'success' ? "check-circle-outline" : "info-outline"} size={40} color={modalConfig.type === 'error' ? theme.colors.error : modalConfig.type === 'success' ? '#38A169' : '#3182CE'} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{modalConfig.title}</Text>
                <View style={styles.modalContent}>
                  <Text style={[styles.modalMessage, { color: theme.colors.textSecondary }]}>{modalConfig.message}</Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: theme.colors.primary }]} onPress={() => {
                    hideModal();
                    if (modalConfig.onPress) {
                      modalConfig.onPress();
                    }
                  }}>
                    <Text style={styles.modalButtonText}>{modalConfig.buttonText}</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>`
);

fs.writeFileSync('src/screens/RegistrationScreen.tsx', content);
console.log('Replaced successfully');
