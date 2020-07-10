#include <Keypad.h>

// NOTES      COL7   COL6   COL5   COL4   COL3   COL2   COL1   COL0   
// PIN        C7     C6     C5     C4     C3     C2     C1     C0   
// ======     ====== ====== ====== ====== ====== ====== ====== ====== 
// ROW9/J/B5  !      #      %      &      (      RT-ARR HOME   RIGHT  
// ROW8/I/B6  "      $      '      \      )      TAB??? DOWN   DEL    
// ROW7/H/B7  q      e      t      u      o      UP-ARR KP 7   KP 9   
// ROW6/G/D0  w      r      y      i      p      NONE   KP 8   KP /   
// ROW5/F/D1  a      d      g      j      l      NONE   KP 4   KP 6   
// ROW4/E/D2  s      f      h      k      :      NONE   KP 5   KP *   
// ROW3/D/D3  z      c      b      m      ;      RETURN KP 1   KP 3   
// ROW2/C/D4  x      v      n      ,      ?      NONE   KP 2   KP +   
// ROW1/B/D5  LSHIFT @      ]      NONE   >      RSHIFT KP 0   KP -   
// ROW0/A/D6  RVS    [      SPACE  <      STOP   CTRL-P KP .   KP =   

const byte COLS = 8;
const byte ROWS = 10;

byte colPins[COLS] = {PIN_C7, PIN_C6, PIN_C5, PIN_C4, PIN_C3, PIN_C2, PIN_C1, PIN_C0};                  // Connect to the column pinouts of the kpd
byte rowPins[ROWS] = {PIN_D7, PIN_D5, PIN_D4, PIN_D3, PIN_D2, PIN_D1, PIN_D0, PIN_B7, PIN_B6, PIN_B5};  // Connect to the row pinouts of the kpd

char keys[ROWS][COLS] = {
  {'!', '#', '%', '&', '(', 'L', 'H', 'R'},
  {'"', '$', '\'', '\\', ')', 'N', 'D', 'B'},
  {'q', 'e', 't', 'u', 'o', 'U', '7', '9'},
  {'w', 'r', 'y', 'i', 'p', 'N', '8', '/'},
  {'a', 'd', 'g', 'j', 'l', 'N', '4', '6'},
  {'s', 'f', 'h', 'k', ':', 'N', '5', '*'},
  {'z', 'c', 'b', 'm', ';', 'E', '1', '3'},
  {'x', 'v', 'n', ',', '?', 'N', '2', '+'},
  {'S', '@', ']', '?', '>', 'S', '0', '-'},
  {'V', '[', ' ', '<', 'S', 'N', '.', '='}
};

Keypad kpd = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

uint16_t KEY_IGNORE = -1;

uint16_t KEY_CODES[ROWS * COLS] = {
  KEY_F13,                KEY_F15,        KEY_F17,          KEY_F18,        KEY_F19,        KEY_MINUS,               KEY_HOME,       KEY_RIGHT,        // Row 0
  KEY_F14,                KEY_F16,        KEY_QUOTE,        KEY_BACKSLASH,  KEY_F20,        KEY_IGNORE,              KEY_DOWN,       KEY_BACKSPACE,    //     1  
  KEY_Q,                  KEY_E,          KEY_T,            KEY_U,          KEY_O,          KEY_TAB,                 KEYPAD_7,       KEYPAD_9,         //     2
  KEY_W,                  KEY_R,          KEY_Y,            KEY_I,          KEY_P,          KEY_IGNORE,              KEYPAD_8,       KEYPAD_SLASH,     //     3
  KEY_A,                  KEY_D,          KEY_G,            KEY_J,          KEY_L,          KEY_IGNORE,              KEYPAD_4,       KEYPAD_6,         //     4
  KEY_S,                  KEY_F,          KEY_H,            KEY_K,          KEY_F21,        KEY_IGNORE,              KEYPAD_5,       KEYPAD_ASTERIX,   //     5
  KEY_Z,                  KEY_C,          KEY_B,            KEY_M,          KEY_SEMICOLON,  KEY_ENTER,               KEYPAD_1,       KEYPAD_3,         //     6
  KEY_X,                  KEY_V,          KEY_N,            KEY_COMMA,      KEY_F22,        KEY_IGNORE,              KEYPAD_2,       KEYPAD_PLUS,      //     7
  MODIFIERKEY_SHIFT,      KEY_F23,        KEY_RIGHT_BRACE,  KEY_IGNORE,     KEY_F24,        MODIFIERKEY_RIGHT_SHIFT, KEYPAD_0,       KEYPAD_MINUS,     //     8
  KEY_TILDE,              KEY_LEFT_BRACE, KEY_SPACE,        KEY_PAGE_UP,    KEY_ESC,        KEY_IGNORE,              KEYPAD_PERIOD,  KEY_EQUAL         //     9
};

uint16_t usbKeys[6] = {KEY_IGNORE, KEY_IGNORE, KEY_IGNORE, KEY_IGNORE, KEY_IGNORE, KEY_IGNORE};
uint8_t  usbKeysUsed = 0;

String msg;

void setup() {

//    Serial.begin(9600);
//    Serial.print("Commodore PET 2001 Keyboard controller v2. Andy Jones (c) 2020");
    
    msg = "";

//    Keyboard.begin();
//    delay(100);
//    Keyboard.press(KEY_NUM_LOCK);
//    delay(100);
//    Keyboard.releaseAll();
}

void loop() {

  // Fills kpd.key[ ] array with up-to 10 active keys.
  // Returns true if there are ANY active keys.
  if (kpd.getKeys()) {

    // Keys currently being pressed for transmission
    static uint8_t modifiers = 0;
    bool updateUSB = false;
    
    // Scan the whole key list. 
    for (int i=0; i<LIST_MAX; i++) {

      // Only find keys that have changed state.
      if (kpd.key[i].stateChanged) {

        uint16_t keyCode = KEY_CODES[kpd.key[i].kcode];

        // Report active key state : IDLE, PRESSED, HOLD, or RELEASED
        switch (kpd.key[i].kstate) { 
                  
          case PRESSED:

            updateUSB = true;
            
            // If the key is a modifier then update modifiers (We only care about shift keys)
            if (isModifier(keyCode)) {

              if (keyCode == MODIFIERKEY_SHIFT) {
                modifiers = modifiers | MODIFIERKEY_SHIFT;
              } else if (keyCode == MODIFIERKEY_RIGHT_SHIFT) {
                modifiers = modifiers | MODIFIERKEY_RIGHT_SHIFT;
              }

              msg = " (MODIFIER) PRESSED.";

            } else {

              setUSBKey(keyCode);
              
              msg = " KEY PRESSED.";
            }

          break;

          case HOLD:
            msg = " HOLD.";
          break;

          case RELEASED:

            updateUSB = true;
            
            // If the key is a modifier then update modifiers (We only care about shift keys)
            if (isModifier(keyCode)) {

              if (keyCode == MODIFIERKEY_SHIFT) {
                modifiers = modifiers & ~MODIFIERKEY_SHIFT;
              } else if (keyCode == MODIFIERKEY_RIGHT_SHIFT) {
                modifiers = modifiers & ~MODIFIERKEY_RIGHT_SHIFT;
              }

              msg = " (MODIFIER) RELEASED.";

            } else {

              unSetUSBKey(keyCode);
              
              msg = " RELEASED.";
              
            }
          break;

          case IDLE:
            msg = " IDLE.";
          break;
        }
                
//        Serial.print("Key ");
//        Serial.print(kpd.key[i].kcode);
//        Serial.print(" - ");
//        Serial.print(kpd.key[i].kchar);
//        Serial.println(msg);
      }
    }

    if (updateUSB) {
 
//      Serial.print("Modifiers = ");
//      Serial.println(modifiers);
//      Serial.print("Keys pressed count = ");
//      Serial.println(usbKeysUsed);
      
      setUSBKeys();
      
      Keyboard.set_modifier(modifiers);
      Keyboard.send_now();
    }
  }
}  // End loop

bool isModifier(uint16_t keyCode) {

  switch(keyCode) {
      case MODIFIERKEY_SHIFT:
      case MODIFIERKEY_RIGHT_SHIFT:
        return true;
      break;
  }

  return false;
}

// Set key in the USB send array
bool setUSBKey(uint16_t keyCode) {

  // If the key pressed should be ignored then return
  if (keyCode == KEY_IGNORE) {
    return false;
  }

  // If all keys are in use then we can't add any more
  if(usbKeysUsed == 6) {
    return false;
  }

  uint8_t keyNum = 0;
  
  // If key is already set in the array then return true
  for(keyNum = 0; keyNum < 6; keyNum++) {
    if(usbKeys[keyNum] == keyCode) {
      return true;
    }
  }
  
  // Key not set already so find free usb key and set it
  for(keyNum = 0; keyNum < 6; keyNum++) {
    if(usbKeys[keyNum] == KEY_IGNORE) {
      usbKeys[keyNum] = keyCode;
      usbKeysUsed ++;
      break;
    }
  }

  return true;
}

// Unset key in the USB send array
bool unSetUSBKey(uint16_t keyCode) {

  uint8_t keyNum = 0;
  
  // If key is set in the array then remove it and return true
  for(keyNum = 0; keyNum < 6; keyNum++) {
    if(usbKeys[keyNum] == keyCode) {
      usbKeys[keyNum] = KEY_IGNORE;
      usbKeysUsed --;
      break;
    }
  }
  
  return true;
}

void setUSBKeys() {
  
  Keyboard.set_key1(usbKeys[0]);
  Keyboard.set_key2(usbKeys[1]);
  Keyboard.set_key3(usbKeys[2]);
  Keyboard.set_key4(usbKeys[3]);
  Keyboard.set_key5(usbKeys[4]);
  Keyboard.set_key6(usbKeys[5]);
}
