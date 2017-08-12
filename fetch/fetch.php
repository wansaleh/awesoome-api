<?php

require 'vendor/autoload.php';

use Psr\Log\LogLevel;
use TrashPanda\ProgressBarLog\ProgressBarLog;
use Colors\Color;
$c = new Color();

$github = json_decode(file_get_contents(dirname(__FILE__) . '/../github.json'));
$headers = [
  'Authorization' => 'token ' . $github->token,
  'User-Agent' => 'Awesome Scraper'
];

$client = new GuzzleHttp\Client();

$db_json = dirname(__FILE__) . '/../db/db.json';
$last_updated_json = dirname(__FILE__) . '/../db/last-updated.json';

$time = time();
if (is_file($last_updated_json)) {
  $last_updated = json_decode(file_get_contents($last_updated_json));
  $last_updated = strtotime($last_updated->date);
}
else {
  $last_updated = 0;
}

$awesome_info = $client->request('GET', "https://api.github.com/repos/{$github->repo}", [
  'headers' => array_merge($headers, [
    'Accept' => 'application/vnd.github.v3.html'
  ])
]);
$awesome_info = json_decode($awesome_info->getBody());
$awesome_pushed_at = strtotime($awesome_info->pushed_at);

// if ($awesome_pushed_at <= $last_updated) {
//   echo $c("<red>No new commits</red>")->colorize() . PHP_EOL;
//   die();
// }

$awesome_readme = $client->request('GET', "https://api.github.com/repos/{$github->repo}/readme", [
  'headers' => array_merge($headers, [
    'Accept' => 'application/vnd.github.v3.html'
  ])
]);

$html = str_get_html((string)$awesome_readme->getBody());

function find_a($ul) {
  $a = [];

  foreach ($ul->children() as $li) {
    $a[] = $li->children(0);
  }

  return $a;
}

$_categories = find_a($html->find('.entry-content', 0)->find('h2', 0)->next_sibling());

$categories_count = count($_categories);

$data = [
  'things' => []
];

// get totals first
$total_items = 0;
foreach ($_categories as $category) {
  $id = substr($category->href, 1);
  $title = trim($category->plaintext);

  $_items = $html->find("a[id='user-content-{$id}']", 0)->parent()->next_sibling()->find('li > a');
  $total_items += count($_items);
}

$progressLog = new ProgressBarLog(6, $total_items);
$progressLog->getProgressBar()->setBarCharacter('<fg=green>=</>');
$progressLog->getProgressBar()->setProgressCharacter('<fg=green>></>');
$progressLog->getProgressBar()->setBarWidth(100);
$progressLog->getProgressBar()->setMessage('Start fetching...', 'title');
$progressLog->getProgressBar()->setFormat("\n \033[44;37m %title:-37s% \033[0m\n\n %current%/%max% %bar% %percent:3s%%\n\n 🏁  %remaining% (<info>%memory%</info>)");
$progressLog->start();


// echo $c("<yellow>Total all items:</yellow> {$total_items}")->colorize() . PHP_EOL;

foreach ($_categories as $category) {
  $id = substr($category->href, 1);
  $title = trim($category->plaintext);

  // if ($id !== 'platforms')
  //   continue;

  // echo $c("<green>Category:</green> {$title}")->colorize() . PHP_EOL;

  $_items = find_a($html->find("a[id='user-content-{$id}']", 0)->parent()->next_sibling());
  $_items_count = count($_items);

  // echo $c("Total items: {$_items_count}")->blue() . PHP_EOL;

  $items = [];

  $i = 0;
  foreach ($_items as $item) {
    $items[] = processItem($title, $item, ++$i, $_items_count, $progressLog);
  }

  $data['things'][] = [
    'id' => $id,
    'title' => $title,
    'items' => $items
  ];
}

function processItem($parentTitle, $item, $i, $total, $progressLog, $prefix = '') {
  global $client, $html, $github, $c, $headers;

  $title = trim($item->plaintext);
  $url = $item->href;
  $full_name = explode('/', str_replace('https://github.com/', '', $url));
  $full_name = $full_name[0] . '/' . $full_name[1];
  $url = 'https://github.com/' . $full_name;

  $percent = number_format(100 * ($i / $total), 2);

  // echo $c("{$prefix}<blue>{$i}/{$total} ({$percent}%)</blue> <yellow>{$prefix}Repo:</yellow> {$full_name}")->colorize() . PHP_EOL;

  $repo_res = $client->request('GET', "https://api.github.com/repos/{$full_name}", [
    'headers' => $headers
  ]);
  $repo_data = json_decode($repo_res->getBody());

  $owner = $repo_data->owner ? $repo_data->owner->login : null;
  $owner_url = $repo_data->owner ? $repo_data->owner->html_url : null;
  $description = $repo_data->description;
  $stargazers = $repo_data->stargazers_count;
  $homepage = $repo_data->homepage;
  $pushed_at = $repo_data->pushed_at;

  // echo $c("{$prefix}<green>Repo info ✅</green> ")->colorize();

  $commits_res = $client->request('GET', "https://api.github.com/repos/{$full_name}/commits?per_page=1", [
    'headers' => $headers
  ]);
  $commits_data = json_decode($commits_res->getBody());

  $last_commit = $commits_data[0]->commit->author->date;
  $last_commit_by = $commits_data[0]->commit->author->name;

  // echo $c("<green> Commits ✅</green>")->colorize() . PHP_EOL;
  $progressLog->addLog(LogLevel::INFO, "Repo: $full_name");

  $progressLog->advance();

  $_next = $item->next_sibling();

  if ($_next && $_next->tag === 'ul') {
    $_subitems = find_a($_next);
    $_subitems_count = count($_subitems);

    // echo $c("Subitems: Total: {$_subitems_count}")->blue() . PHP_EOL;

    $subitems = [];
    $k = 0;
    foreach ($_subitems as $item) {
      $subitems[] = processItem($title, $item, ++$k, $_subitems_count, $progressLog, $prefix . '  ');
    }

    return [
      'id' => $full_name,
      'title' => $title,
      'url' => $url,
      'parent_title' => $parentTitle,
      // 'description' => $description,
      // 'owner' => $owner,
      // 'owner_url' => $owner_url,
      // 'homepage' => $homepage,
      'stargazers' => $stargazers,
      'last_commit' => $last_commit,
      'pushed_at' => $pushed_at,
      'items' => $subitems,
    ];
  }
  else {
    return [
      'id' => $full_name,
      'title' => $title,
      'url' => $url,
      'parent_title' => $parentTitle,
      // 'description' => $description,
      // 'owner' => $owner,
      // 'owner_url' => $owner_url,
      // 'homepage' => $homepage,
      'stargazers' => $stargazers,
      'last_commit' => $last_commit,
      'pushed_at' => $pushed_at,
    ];
  }
}

function getJson($data) {
  return preg_replace_callback ('/^ +/m', function ($m) {
    return str_repeat (' ', strlen ($m[0]) / 2);
  }, json_encode($data, !JSON_HEX_AMP | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

file_put_contents($db_json, getJson($data));
echo $c("<green>Done saving to:</green> {$db_json}")->colorize() . PHP_EOL;

file_put_contents($last_updated_json, getJson(['date' => date('c', $time)]));
echo $c("<green>Done saving to:</green> {$last_updated_json}")->colorize() . PHP_EOL;
