import fs from 'fs'
import path from 'path'

const portraitsDir = path.join(__dirname, '../../frontend/public/portraits/lotr')

const expectedNewCharacters = [
  'bilbo',
  'balrog',
  'nazgul',
  'mouth-of-sauron',
  'gothmog',
  'grishnakh',
  'ugluk',
  'shagrat',
  'gorbag',
  'radagast',
  'glorfindel',
  'haldir',
  'celeborn',
  'denethor',
  'rosie',
  'farmer-maggot',
  'old-man-willow',
  'goldberry',
  'quickbeam',
  'shadowfax',
  'bill',
  'smeagol',
  'elendil',
  'isildur',
  'cave-troll'
]

describe('LOTR Portrait Generator', () => {
  test('generates all 25 new character SVGs', () => {
    for (const character of expectedNewCharacters) {
      const filePath = path.join(portraitsDir, `${character}.svg`)
      expect(fs.existsSync(filePath)).toBe(true)
    }
  })

  test('generated SVGs are valid XML', () => {
    for (const character of expectedNewCharacters) {
      const filePath = path.join(portraitsDir, `${character}.svg`)
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
      expect(content).toMatch(/<\/svg>$/)
    }
  })

  test('generated SVGs contain rect elements', () => {
    for (const character of expectedNewCharacters) {
      const filePath = path.join(portraitsDir, `${character}.svg`)
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toContain('<rect')
    }
  })

  test('each SVG has proper dimensions', () => {
    for (const character of expectedNewCharacters) {
      const filePath = path.join(portraitsDir, `${character}.svg`)
      const content = fs.readFileSync(filePath, 'utf8')
      expect(content).toMatch(/width="\d+"/)
      expect(content).toMatch(/height="\d+"/)
      expect(content).toMatch(/viewBox="0 0 \d+ \d+"/)
    }
  })
})
