# Accuweather Serverless

## Quickstart

1. Instalar o **nodejs** e o **npm**.
2. Instalar o pacote do serverless:
    `$ npm install -g serverless`
3. Instalar o aws-cli [https://aws.amazon.com/pt/cli/](https://aws.amazon.com/pt/cli/)
4. Configurar o aws-cli, entrando no terminal e digitando:
    `$ aws configure`
5. Complete com seu Access Key e Secret Access Key;
6. Faça o deploy da stack, configurando as variáveis da **apiKey** (relativa a chave da API do Accuweather) e do **bucketName** (relativo ao nome do bucket do S3 a ser criado):
    `$ serverless deploy -v --stage prod --apiKey PPcoenbNcLKt1iG2s7GFAEXAMPLE --bucketName accuweather-example`

## Sobre



## Queries

As queries a seguir foram propostas para responder as seguintes perguntas:

  • Qual cidade tem a maior altitude?
  • Qual cidade tem a menor população?
  • Qual o volume acumulado de precipitação (chuva) por cidade em um período de tempo escolhido dinamicamente?
  • Qual a amplitude térmica diária (diferença entre as mínimas e máximas temperaturas registradas em um dia) média por cidade?
  • Dentre as cidades escolhidas, há alguma correlação entre altitude e amplitude térmica diária?

Foi utilizado o Redash ([https://github.com/getredash/redash](https://github.com/getredash/redash)) com integração ao AWS Athena. O AWS Glue foi utilizado para gerar as tabelas no AWS Athena. Seguem as queries adicionadas ao Redash:

**Cidade Mais Alta**

    SELECT
        name,
        admincode,
        elevation
    FROM accuweather.locations
    ORDER BY elevation DESC, cast(partition_0 AS integer) DESC, cast(partition_1 AS integer) DESC, cast(partition_2 AS integer) DESC, cast(partition_3 AS integer) DESC limit 1;


**Menor População**

    SELECT
        name,
        admincode,
        population
    FROM accuweather.locations
    ORDER BY population ASC, cast(partition_0 AS integer) DESC, cast(partition_1 AS integer) DESC, cast(partition_2 AS integer) DESC, cast(partition_3 AS integer) DESC limit 1;


**Volume Acumulado de Precipitação**

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


**Amplitude Térmica Diária**

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

## Melhorias

- Para caso o número de cidades a ser processado extrapole o limite de tempo de 15min do AWS Lambda poderia ser implementado um pipeline anterior que por exemplo, consumiria um CSV, adicionaria em uma fila que seria consumida pelo AWS Lambda.
- Caso o tamanho do record a ser escrito no Firehose supere 1000KB (limite do **putRecord**) poderia dividir em chunks e usar a chamada **putRecordBatch**.