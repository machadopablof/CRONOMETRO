# Conometro ⏱

Sistema web de **cronômetro** (stopwatch) e **temporizador** (countdown) com layout moderno e interativo, feito em HTML, CSS e JavaScript puro — sem dependências ou build step.

## Funcionalidades

**Cronômetro**
- Iniciar, pausar, continuar e zerar
- Marcação de voltas com tempo parcial e total
- Destaque automático da melhor e pior volta
- Anel de progresso animado (uma volta completa por minuto)

**Temporizador**
- Definição de horas/minutos/segundos ou atalhos rápidos (1, 5, 10, 15, 30 min)
- Botão "+1 min" mesmo com o contador em andamento
- Anel de progresso regressivo, com aviso visual nos últimos 10 segundos
- Alarme sonoro (sintetizado via Web Audio, sem arquivos externos), notificação do navegador e efeito visual ao finalizar

**Estudos**
- Toda sessão do Temporizador (concluída ou interrompida) é registrada automaticamente, com horário de início/fim e duração
- Card "Estudado hoje" ao lado do Temporizador, com a lista de sessões do dia
- Aba "Estudos" com totais de hoje, dos últimos 7 dias e geral, além do histórico completo agrupado por dia
- Dados salvos no `localStorage` do navegador (não saem do seu dispositivo); botão para limpar o histórico
- Exportar/importar o histórico como arquivo `.json`, para fazer backup ou levar os dados para outro navegador/dispositivo (ex.: guardando o arquivo no GitHub manualmente)

**Geral**
- Tema claro/escuro com preferência salva no navegador
- Atalhos de teclado: `Espaço` (iniciar/pausar), `L` (marcar volta), `R` (zerar)
- Visual com glassmorphism, gradientes animados e totalmente responsivo

## Como usar

Basta abrir `index.html` em um navegador, ou servir a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8080
```

## Estrutura

```
index.html      Estrutura da página
css/style.css   Estilos e tema
js/script.js    Lógica do cronômetro, temporizador e interações
```
