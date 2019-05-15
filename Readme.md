# Accuweather Serverless

## Quickstart

1. Instalar o **nodejs** e o **npm**.
2. Instalar o pacote do serverless globalmente:
    `$ npm install -g serverless`
3. Instalar o aws-cli [https://aws.amazon.com/pt/cli/](https://aws.amazon.com/pt/cli/)
4. Configurar o aws-cli, entrando no terminal e digitando:
    `$ aws configure`
5. Complete com seu Access Key e Secret Access Key;
6. Instalar as dependências rodando `npm install` na raiz do repositório;
6. Faça o deploy da stack, configurando as variáveis da **apiKey** (relativa a chave da API do Accuweather) e do **bucketName** (relativo ao nome do bucket do S3 a ser criado):
    `$ serverless deploy -v --stage prod --apiKey PPcoenbNcLKt1iG2s7GFAEXAMPLE --bucketName accuweather-example`

## Sobre

Esse projeto tem como objetivo ser uma demonstração da utilização de ferramentas serverless da AWS para coleta dos dados do Accuweather. A arquitetura de ETL funciona da seguinte maneira:

  - Foi utilizado o pacote serverless para a implementação da arquitetura de coleta dos dados.
  - Existem duas funções lambda implementadas em NodeJS localizadas no arquivo **handler.js**. Uma das funções realiza a coleta dos dados das localidades, ja a outra realiza a coleta dos dados meteorológicos para cada localização.
  - As localizações se encontram no arquivo **input.json** na raiz do repositório.
  - As funções lambda são ativadas por eventos do CloudWatch. A de localidades esta configurada para rodar no dia primeiro de cada ano. Já a de dados meteorológicos está agendada para rodar todos os dias a meia-noite.
  - As funções irão fazer "push" dos dados para dois fluxos de entrega o LocationsDeliveryStream e o ConditionsDeliveryStream.
  - Tais fluxos de entrega irão "gzipar" e salvar os dados no S3 no bucket especificado.
  - Após o pipeline ser rodado pela primeira vez você poderá utilizar o AWS Glue para catalogar os dados e criar as tabelas para serem consumidas pelo AWS Athena.


## Queries

As queries a seguir foram propostas para responder as seguintes perguntas:

  - Qual cidade tem a maior altitude?
  - Qual cidade tem a menor população?
  - Qual o volume acumulado de precipitação (chuva) por cidade em um período de tempo escolhido dinamicamente?
  - Qual a amplitude térmica diária (diferença entre as mínimas e máximas temperaturas registradas em um dia) média por cidade?
  - Dentre as cidades escolhidas, há alguma correlação entre altitude e amplitude térmica diária?

Foi utilizado o Redash ([https://github.com/getredash/redash](https://github.com/getredash/redash)) com integração ao AWS Athena. O AWS Glue foi utilizado para gerar as tabelas no AWS Athena. Seguem as queries adicionadas ao Redash:

**Cidade Mais Alta**

    SELECT
        name,
        admincode,
        elevation
    FROM accuweather.locations
    ORDER BY elevation DESC, cast(partition_0 AS integer) DESC, cast(partition_1 AS integer) DESC, cast(partition_2 AS integer) DESC, cast(partition_3 AS integer) DESC limit 1;


**Altitudes Cidades**

    SELECT
        l.name,
        l.admincode,
        l.elevation as Altitude
    FROM accuweather.locations l
    INNER JOIN
        (SELECT 
            max(cast(partition_0 AS integer)) as year,
            max(cast(partition_1 AS integer)) as month,
            max(cast(partition_2 AS integer)) as day,
            max(cast(partition_3 AS integer)) as hour
        FROM accuweather.locations) AS m
    ON 
        cast(l.partition_0 AS integer) = m.year
        AND cast(l.partition_1 AS integer) = m.month
        AND cast(l.partition_2 AS integer) = m.day
        AND cast(l.partition_3 AS integer) = m.hour
    ORDER BY l.name


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

## Possíveis Melhorias

- Para caso o número de cidades a ser processado extrapole o limite de tempo de 15 minutos do AWS Lambda poderia ser implementado um pipeline anterior que por exemplo, consumiria um CSV, adicionaria em uma fila que seria consumida pelo AWS Lambda.
- Caso o tamanho do record a ser escrito no Firehose supere 1000 KB (limite do **putRecord**) poderia dividir em chunks e usar a chamada **putRecordBatch**.
- Agendar para as funções Lambda coletarem o dado várias vezes por dia, garantindo assim que caso a API tenha um downtime não seja perdido nenhum dado. Para isso terá também que fazer alterações nas queries.
- Utilização de testes automáticos com integração com o linter.