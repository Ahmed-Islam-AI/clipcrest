# ClipCrest

> Screenshots ke saath poori guide: folder mein **`SETUP-GUIDE.html`** kholo.

Lambi videos aur live streams se **captions wale vertical clips** (Reels / Shorts / TikTok) banao, apne hi computer pe.
Free hai, koi sign-in nahi chahiye.

## Apne PC pe kaise chalaye (3 steps)

**1. Download karo.** [Yahan se download karo](https://github.com/Ahmed-Islam-AI/clipcrest/releases/latest): GitHub Releases page khulega, wahan se ClipCrest ki ZIP download karo.

**2. Unzip karo, chhote folder mein.**
- **Windows:** ZIP pe right-click karo, phir **Extract All**, aur folder ko `C:\ClipCrest` pe rakho.
  Desktop ya Downloads ke andar gehre folder mein mat rakhna: Windows lambe path pe speech model load nahi kar paata.
- **Mac:** ZIP pe double-click karo aur folder ko apne home folder mein rakh do.

**3. Start karo.**
- **Windows:** `Start-ClipCrest-Windows.bat` pe double-click karo.
  "Windows protected your PC" aaye toh **More info** dabao, phir **Run anyway**.
- **Mac:** `Start-ClipCrest-Mac.command` pe right-click karo, phir **Open**, phir dobara **Open** (pehli baar hi aisa karna hai).
- **Linux:** terminal mein `bash start-linux.sh` chalao.

Pehli baar 5-10 minute lagenge: script khud Python, ffmpeg aur baaki zaroori cheezein install karegi, aur speech model
(lagbhag 480 MB) download karegi. Phir browser apne aap khul jayega. Agli baar se bas wahi file double-click karni hai,
aur app kuch hi second mein khul jayega.

Jab tak app use kar rahe ho, kaali window (terminal) khuli rakhna. Use band karoge toh app bhi band ho jayega.

### AI key daalo (free, 2 minute)

AI key ke bina bhi clips bante hain, lekin sirf awaaz ki loudness dekh ke. Achhe clips ke liye:

1. https://aistudio.google.com/apikey pe jao aur **Create API key** dabao (Google ki free key).
2. ClipCrest mein **Settings, AI** kholo, **Gemini** chuno, key paste karo, aur **Save and test** dabao.

Phir YouTube, Twitch ya Kick ka link paste karo aur **Make clips** dabao.

### Kuch problem aaye toh

| Problem | Kya karein |
|---|---|
| "winget is not available" | Microsoft Store se **App Installer** install karo, phir dobara chalao |
| "DLL load failed ... too long" | Folder ko `C:\ClipCrest` pe le jao aur dobara chalao |
| Python install ke baad error | Window band karo aur `.bat` file dobara double-click karo |
| Browser nahi khula | Khud kholo: http://127.0.0.1:8765 |
| Mac: "cannot be opened" | Right-click karo, phir **Open** (double-click nahi) |

Zaroorat: Windows 10/11, macOS ya Linux, 8 GB RAM, lagbhag 3 GB khaali jagah. Video banne ka kaam tumhare
computer pe hota hai, aur tumhari videos kahin upload nahi hoti.

## Naya version kaise lein

[Releases page](https://github.com/Ahmed-Islam-AI/clipcrest/releases/latest) se naya ZIP download karo aur usi folder mein extract karke files replace kar do. Tumhari videos aur clips (`data` folder) safe rehti hain.
Phir start file dobara chalao.

## Credits aur licence

ClipCrest MIT License ke tahat open source hai (LICENSE file dekho).
Caption fonts (`studio/fonts/`: Anton, Archivo Black, Poppins) SIL Open Font License ke tahat hain.

Sirf wahi videos clip karo jo tumhari hain ya jinki permission hai, aur jahan post karte ho un sites ke rules follow karo.
