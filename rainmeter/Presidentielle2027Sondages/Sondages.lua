-- Presidentielle 2027 : sondages pour Rainmeter.
-- Lit /api/sondages?format=tsv (meme moyenne que le site et les stories :
-- dernier sondage de chaque institut sur 7 jours, corrige des biais d'institut)
-- et remplit les meters du skin. Aucun calcul de moyenne ici.
-- Fichier volontairement en ASCII : les accents viennent des donnees et du .ini.

local PARTIS = {
  RN = '24,62,150', LFI = '204,36,67', PP = '226,74,134', PS = '236,72,104', LE = '22,163,74',
  PCF = '214,24,24', LO = '150,20,20', NPA = '170,30,40', HOR = '30,150,215', RE = '255,196,0',
  MD = '250,140,20', LR = '0,92,190', REC = '72,72,110', DLF = '0,130,196', LFH = '130,96,176', UDI = '0,160,200',
}
local NB_CANDIDATS, NB_DUELS, NB_INSTITUTS = 8, 4, 8

local function champs(l)
  local t = {}
  for v in (l .. '\t'):gmatch('([^\t]*)\t') do t[#t + 1] = v end
  return t
end

-- Texte TSV du site -> tables (premierTour, secondTour, instituts[1|2])
function LireSondagesSite(texte)
  local s = { premierTour = {}, secondTour = {}, instituts = { {}, {} } }
  if not texte or texte == '' then return s end
  for l in texte:gsub('\r', ''):gmatch('[^\n]+') do
    local c = champs(l)
    if c[1] == '#maj' then
      s.maj, s.mode, s.sous, s.dernier = tonumber(c[2]), c[3], c[4], c[5]
    elseif c[1] == 'C' then
      s.premierTour[#s.premierTour + 1] = { rang = tonumber(c[2]), id = c[3], nom = c[4], parti = c[5],
        score = tonumber(c[6]), marge = tonumber(c[7]), evolution = tonumber(c[8]), nb = tonumber(c[9]) }
    elseif c[1] == 'D' then
      s.secondTour[#s.secondTour + 1] = { g = { id = c[2], nom = c[3], parti = c[4] },
        d = { id = c[5], nom = c[6], parti = c[7] }, sg = tonumber(c[8]), nb = tonumber(c[9]), dernier = c[10] }
    elseif c[1] == 'S' then
      local liste = s.instituts[tonumber(c[2]) or 1]
      liste[#liste + 1] = { nom = c[3], terrain = c[4], n = tonumber(c[5]), poids = tonumber(c[6]),
        correction = (c[7] ~= nil and c[7] ~= '') and c[7] or nil }
    end
  end
  return s
end

-- 33.3 -> "33,3 %", 12.0 -> "12 %" (comme le site)
local function pct(x)
  if not x then return '' end
  local r = math.floor(x + 0.5)
  if math.abs(x - r) < 0.05 then return r .. ' %' end
  return (string.format('%.1f', x):gsub('%.', ',')) .. ' %'
end

local function milliers(n)
  if not n then return '' end
  local t = tostring(math.floor(n))
  return t:reverse():gsub('(%d%d%d)', '%1 '):reverse():gsub('^ ', '')
end

local function regler(meter, option, valeur)
  SKIN:Bang('!SetOption', meter, option, tostring(valeur))
end

local function afficher()
  SKIN:Bang('!UpdateMeter', '*')
  SKIN:Bang('!Redraw')
end

function Initialize() end

function Erreur()
  regler('MeterSous', 'Text', SKIN:GetVariable('TexteErreur'))
  afficher()
end

function Maj()
  local s = LireSondagesSite(SKIN:GetMeasure('MesureSondages'):GetStringValue())
  if #s.premierTour == 0 then return Erreur() end

  regler('MeterSous', 'Text', s.sous or '')
  local largeur = (tonumber(SKIN:GetVariable('Largeur')) or 360) - 28
  local max = math.max(10, s.premierTour[1].score or 10)

  for i = 1, NB_CANDIDATS do
    local c = s.premierTour[i]
    if c then
      regler('MeterNom' .. i, 'Text', c.nom .. '  ' .. c.parti)
      regler('MeterScore' .. i, 'Text', pct(c.score))
      local e = c.evolution
      if not e or math.abs(e) < 0.25 then
        regler('MeterEvo' .. i, 'Text', e and ('= ' .. (string.format('%.1f', math.abs(e)):gsub('%.', ','))) or '')
        regler('MeterEvo' .. i, 'FontColor', '128,128,134')
      else
        regler('MeterEvo' .. i, 'Text', (e > 0 and '+' or '-') .. (string.format('%.1f', math.abs(e)):gsub('%.', ',')))
        regler('MeterEvo' .. i, 'FontColor', e > 0 and '48,209,88' or '255,99,88')
      end
      regler('MeterBarre' .. i, 'W', math.max(3, math.floor(largeur * c.score / max)))
      regler('MeterBarre' .. i, 'SolidColor', PARTIS[c.parti] or '128,128,136')
    else
      regler('MeterNom' .. i, 'Text', '')
      regler('MeterScore' .. i, 'Text', '')
      regler('MeterEvo' .. i, 'Text', '')
      regler('MeterBarre' .. i, 'W', 1)
    end
  end

  for i = 1, NB_DUELS do
    local d = s.secondTour[i]
    regler('MeterDuel' .. i, 'Text', d and (d.g.nom .. '  ' .. pct(d.sg) .. '   vs   ' .. pct(100 - d.sg) .. '  ' .. d.d.nom) or '')
  end

  for i = 1, NB_INSTITUTS do
    local t = s.instituts[1][i]
    local txt = ''
    if t then
      txt = t.nom .. '  ' .. (t.poids or '') .. ' %  (' .. t.terrain .. (t.n and (', ' .. milliers(t.n) .. ' pers.') or '') .. ')'
      if t.correction then txt = txt .. '  ' .. t.correction end
    end
    regler('MeterInst' .. i, 'Text', txt)
  end

  afficher()
end
