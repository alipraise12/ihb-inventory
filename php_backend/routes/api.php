<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::get('/contacts', function () {
    return response()->json([
        ['name' => 'Chidi Okafor', 'phone' => '+234 803 111 2222', 'isRegistered' => true],
        ['name' => 'Amina Yusuf', 'phone' => '+234 815 333 4444', 'isRegistered' => true],
        ['name' => 'Tunde Bakare', 'phone' => '+234 706 555 6666', 'isRegistered' => false],
        ['name' => 'Emeka Obi', 'phone' => '+234 902 777 8888', 'isRegistered' => false],
        ['name' => 'Funmi Adebayo', 'phone' => '+234 809 999 0000', 'isRegistered' => true],
        ['name' => 'Sarah John', 'phone' => '+1 415 555 2671', 'isRegistered' => false],
    ]);
});