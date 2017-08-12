<?php

require 'vendor/autoload.php';

$github = json_decode(file_get_contents(dirname(__FILE__) . '/../github.json'));
$header = [
  'Authorization' => 'token ' . $github->token
];

$client = new GuzzleHttp\Client();


// $repo_res = $client->request('GET', "https://api.github.com/repos/{$github->repo}", [
$repo_res = $client->request('GET', "https://api.awesoo.me/things", [
  'headers' => [
    // 'User-Agent' => 'Scraper',
    // 'Authorization' => 'token ' . $github->token
  ]
]);
$repo_data = json_decode($repo_res->getBody());


pp($repo_data);

