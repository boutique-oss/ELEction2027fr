-- Lecture des sondages déjà calculés par le site (/api/sondages?format=tsv).
-- Même moyenne que la page et les stories : dernier sondage de chaque institut
-- sur 7 jours, corrigée des biais d'institut. Le widget n'a plus à refaire le calcul.
--
-- Dans le skin :
--   [MesureSondages]
--   Measure=WebParser
--   URL=https://<ton-site>.vercel.app/api/sondages?format=tsv
--   RegExp=(?siU)^(.*)$
--   UpdateRate=900
--   FinishAction=[!CommandMeasure MesureScript "MajSondages()"]
--
-- Puis dans le script Lua : dofile(SKIN:GetVariable('@') .. 'SondagesSite.lua')
-- et  local s = LireSondagesSite(SKIN:GetMeasure('MesureSondages'):GetStringValue())

local function champs(l)
  local t = {}
  for v in (l .. '\t'):gmatch('([^\t]*)\t') do t[#t + 1] = v end
  return t
end

local function nombre(v)
  return tonumber(v)
end

function LireSondagesSite(texte)
  local s = { premierTour = {}, secondTour = {}, instituts = { {}, {} } }
  if not texte or texte == '' then return s end
  for l in texte:gmatch('[^\n]+') do
    local c = champs(l)
    if c[1] == '#maj' then
      s.maj, s.mode, s.sous, s.dernier = nombre(c[2]), c[3], c[4], c[5]
    elseif c[1] == 'C' then
      s.premierTour[#s.premierTour + 1] = { rang = nombre(c[2]), id = c[3], nom = c[4], parti = c[5],
        score = nombre(c[6]), marge = nombre(c[7]), evolution = nombre(c[8]), nb = nombre(c[9]) }
    elseif c[1] == 'D' then
      s.secondTour[#s.secondTour + 1] = { g = { id = c[2], nom = c[3], parti = c[4] },
        d = { id = c[5], nom = c[6], parti = c[7] }, sg = nombre(c[8]), nb = nombre(c[9]), dernier = c[10] }
    elseif c[1] == 'S' then
      local liste = s.instituts[nombre(c[2]) or 1]
      liste[#liste + 1] = { nom = c[3], terrain = c[4], n = nombre(c[5]), poids = nombre(c[6]),
        correction = c[7] ~= '' and c[7] or nil }
    end
  end
  return s
end

-- « Ifop 23 % · Elabe 22 % · … » pour une ligne de sources sous le classement
function InstitutsTexte(s, tour)
  local t = {}
  for _, i in ipairs(s.instituts[tour or 1]) do t[#t + 1] = i.nom .. ' ' .. i.poids .. ' %' end
  return table.concat(t, ' · ')
end
