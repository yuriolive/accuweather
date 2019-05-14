# todo cron crawler locations

  • Qual cidade tem a maior altitude?
  • Qual cidade tem a menor população?
  • Qual o volume acumulado de precipitação (chuva) por cidade em um período de tempo escolhido dinamicamente?
  • Qual a amplitude térmica diária (diferença entre as mínimas e máximas temperaturas registradas em um dia) média por cidade?
  • Dentre as cidades escolhidas, há alguma correlação entre altitude e amplitude térmica diária?

Cidade Mais Alta
SELECT
    name,
    admincode,
    elevation
FROM accuweather.locations
ORDER BY elevation DESC, cast(partition_0 AS integer) DESC, cast(partition_1 AS integer) DESC, cast(partition_2 AS integer) DESC, cast(partition_3 AS integer) DESC limit 1;


Menor População
SELECT
    name,
    admincode,
    population
FROM accuweather.locations
ORDER BY population ASC, cast(partition_0 AS integer) DESC, cast(partition_1 AS integer) DESC, cast(partition_2 AS integer) DESC, cast(partition_3 AS integer) DESC limit 1;


Volume Acumulado de Precipitação
SELECT
    round(sum(precipitation), 1) AS "Precipitação",
    name,
    admincode
FROM accuweather.conditions
WHERE 
    from_unixtime(epochtime) >= date_parse('{{ Date Range.start }}', '%Y-%m-%d %H:%i') + interval '3' hour
    AND from_unixtime(epochtime) <= date_parse('{{ Date Range.end }}', '%Y-%m-%d %H:%i') + interval '3' hour
GROUP BY locationkey, name, admincode
ORDER BY name;


Amplitude Térmica Diária
SELECT 
    round(max(temperature) - min(temperature), 1) AS "Amplitude Térmica Diária",
    name,
    admincode
FROM accuweather.conditions
WHERE
    from_unixtime(epochtime) >= date_parse('{{ Date }}', '%Y-%m-%d') + interval '3' hour
    AND from_unixtime(epochtime) <= date_parse('{{ Date }}', '%Y-%m-%d') + interval '27' hour
GROUP BY locationkey, name, admincode
ORDER BY name;

  • Qual o volume acumulado de precipitação (chuva) por cidade em um período de tempo escolhido dinamicamente?
  
  • Qual a amplitude térmica diária (diferença entre as mínimas e máximas temperaturas registradas em um dia) média por cidade?
  
  • Dentre as cidades escolhidas, há alguma correlação entre altitude e amplitude térmica diária?